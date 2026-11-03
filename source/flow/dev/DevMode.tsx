/* Developer mode. A gear on every screen, every moment of the flow in order, arrow keys to step.
   It sits beside the product and only talks to it through flow/dev/store.ts and the engine's jump(). */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, Settings } from 'lucide-react';

import { stopVoice } from '../audio';
import { DialPanel, DialRow, DialSeg, DialToggle } from '../ds/DialPanel';
import { SCENARIOS, type EngineDev } from '../engine/stage';
import { useFlow, type FlowState } from '../engine/store';
import type { ProjectId } from '../types';
import { askTurn, findTurn, gist, promptTurn, voiceTurn } from './samples';
import { DEV_GROUPS, DEV_STEPS, devAsk, devMark, setPref, stepIndex, useDev, type DevAction } from './store';
import LookTab from './LookTab';
import { setInspecting, useInspect } from './Inspector';
import './dev.css';

const ICON = { size: 16, strokeWidth: 1.75 } as const;
const engine = () => (window as unknown as { __engine?: EngineDev | null }).__engine;
const TAB_KEY = 'zero-stage-dev-tab';
type Tab = 'flow' | 'look';
const readTab = (): Tab => {
  try {
    return localStorage.getItem(TAB_KEY) === 'look' ? 'look' : 'flow';
  } catch {
    return 'flow';
  }
};

/* where the store says you are. Opening and the Room mark their own moments, this is the floor under them */
const place = (s: FlowState, at: string): string | null => {
  if (s.screen === 'breakdown' || s.screen === 'objective') return 'objective';
  if (s.screen === 'world') return ['world', 'card', 'brief'].includes(at) ? null : 'world';
  if (s.screen === 'kickoff') return at.startsWith('kickoff:') ? null : 'kickoff:intro';
  if (s.screen === 'pou') return 'objective';
  const st = s.stage;
  if (!st) return 'stage';
  if (s.project && st.stageId !== s.project.stages[0]?.id) {
    if (st.stageId !== 'model') return at === st.stageId ? null : st.stageId;
    return at.startsWith('model') ? null : 'model';
  }
  if (st.phase === 'pou') return 'pou-stage';
  if (st.phase === 'done' || st.phase === 'approved' || st.phase === 'feedback') return st.phase;
  if (st.phase === 'review') return at === 'feedback' || at === 'approved' ? null : 'submit';
  const now = st.steps.find((x) => x.state === 'now');
  if (now?.kind === 'prompt') return 'prompt';
  if (now?.kind === 'submit') return 'submit';
  if (now?.kind === 'find' && now.slots.filter((x) => x.filled).length >= 3) return 'issues-3';
  return 'stage';
};
/* on the stage the truth only moves you forward, so a moment you jumped to is not pulled back to where its step began */
const truth = (s: FlowState, at: string): string | null => {
  const id = place(s, at);
  if (id && s.screen === 'stage' && stepIndex(id) < stepIndex(at)) return null;
  return id;
};

/* "do this for me" on the stage, read from the store at the moment you ask. Every entry is the learner's own turn,
   said the way they would say it, and she answers it as she would: one Next is one turn and her reply */
const stageActions = (s: FlowState): DevAction[] => {
  const st = s.stage;
  if (s.screen !== 'stage' || !st) return [];
  const def = SCENARIOS[st.projectId].stages[st.stageId];
  if (!def) return [];
  const { actions } = s;
  const pid = st.projectId;
  const say = (id: string, text: string, voiced?: boolean): DevAction => ({ id, label: `You: ${gist(text)}`, run: () => actions.send(text, voiced) });
  const hand = (how: 'first' | 'last') => () => void engine()?.handIn(how);
  const yn = [...st.msgs].reverse().find((m) => m.options?.[0]?.id === 'yes');
  if (yn) return [{ id: 'yes', label: 'You: Yes', run: () => actions.choose(yn.id, 'yes') }];
  /* she is reading what you sent. Her review is her reply, so Next waits for it instead of jumping past it */
  if (st.phase === 'review') return [{ id: 'wait', label: 'She is reading it', run: () => undefined }];
  if (st.phase === 'feedback') return [{ id: 'clean', label: 'You: tick her notes, send the fixed file', run: hand('last') }];
  if (st.phase === 'approved') return [{ id: 'pou', label: 'You: Start the POU', run: () => actions.startPou() }];
  if (st.phase === 'pou') {
    /* her questions are the stage's lines plus one curveball, so find the one she is asking by its words */
    const asked = st.pou.lines[st.pou.asking]?.text;
    const q = [...def.pou.lines, ...def.pou.curve].find((x) => x.text === asked);
    if (!q) return [];
    const note = voiceTurn(pid, q.text, q.say);
    return [{ id: 'answer', label: `Voice note: ${gist(note)}`, run: () => actions.pouAnswer(note) }];
  }
  if (st.phase !== 'work') return [];
  const now = st.steps.find((x) => x.state === 'now');
  const step = def.flow.find((x) => x.id === now?.id);
  if (!now || !step) return [];
  if (step.kind === 'find') {
    const turn = findTurn(pid, step, (id) => now.slots.some((x) => x.id === id && x.filled));
    return turn ? [say(`issue:${turn.id}`, turn.text)] : [];
  }
  if (step.kind === 'prompt') {
    const draft = [...st.msgs].reverse().find((m) => m.options?.[0]?.id === 'use');
    if (draft) return [{ id: 'use', label: 'You: Use her prompt', run: () => actions.choose(draft.id, 'use') }];
    return [say('prompt', promptTurn(pid, step.id, step.draft))];
  }
  if (step.kind === 'submit') {
    /* the whole loop: a first try that comes back with notes, then the fixed one */
    return [
      { id: 'rough', label: 'You: hand in your first file', run: hand('first') },
      { id: 'clean', label: 'You: hand in the clean file', run: hand('last') },
    ];
  }
  if (step.kind === 'ask') {
    const link = step.takes === 'link';
    const turn = say(`ask:${step.id}`, askTurn(pid, step.id, def, link));
    /* a link she checks has to be there to find: the sample repo is the fresh one you just made */
    return [link ? { ...turn, run: () => (engine()?.setRepo('submit'), turn.run()) } : turn];
  }
  return [];
};

function Ticks({ at, onGo }: { at: string; onGo?: (id: string) => void }) {
  const here = stepIndex(at);
  return (
    <span className="zdm-ticks">
      {DEV_GROUPS.map((g) => (
        <span className="zdm-tg" key={g}>
          {DEV_STEPS.filter((x) => x.group === g).map((x) => {
            const n = stepIndex(x.id);
            const state = n === here ? 'on' : n < here ? 'past' : undefined;
            return onGo ? (
              <button key={x.id} type="button" className="zdm-tick" data-state={state} title={`${g}, ${x.label}`} aria-label={`${g}, ${x.label}`} onClick={() => onGo(x.id)} />
            ) : (
              <i key={x.id} className="zdm-tick" data-state={state} />
            );
          })}
        </span>
      ))}
    </span>
  );
}

/* the stage ground: the founder call picked blue white, these are the others to compare on the same screen */
type StageBg = 'blue' | 'white' | 'grey' | 'warm';
const readBg = (): StageBg => {
  try {
    const v = new URLSearchParams(location.search).get('bg') ?? localStorage.getItem('zero-same-stage-bg');
    return v === 'white' || v === 'grey' || v === 'warm' ? v : 'blue';
  } catch {
    return 'blue';
  }
};

export default function DevMode() {
  const screen = useFlow((s) => s.screen);
  const projectId = useFlow((s) => s.project?.id) as ProjectId | undefined;
  const flowActions = useFlow((s) => s.actions);
  const lightStage = useFlow((s) => (s.ui as { lightStage?: boolean }).lightStage ?? false);
  const stage = useFlow((s) => s.stage);
  const { at, gear, keys, layout, actions: offered } = useDev();

  const [open, setOpen] = useState(false);
  const [fast, setFast] = useState(false);
  const [bg, setBg] = useState<StageBg>(readBg);
  useEffect(() => {
    document.documentElement.dataset.dsBg = bg;
    try {
      localStorage.setItem('zero-same-stage-bg', bg);
    } catch {
      /* private window: the choice lasts this visit */
    }
  }, [bg]);
  const [hud, setHud] = useState(false);
  const [shelf, setShelf] = useState<string | null>(null);
  const [tab, setTabState] = useState<Tab>(readTab);
  const setTab = (t: Tab) => {
    setTabState(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* it still switches for this visit */
    }
  };
  const hudTimer = useRef<number | undefined>(undefined);

  const here = stepIndex(at);
  const step = DEV_STEPS[here] ?? DEV_STEPS[0];

  const flash = useCallback(() => {
    setHud(true);
    window.clearTimeout(hudTimer.current);
    hudTimer.current = window.setTimeout(() => setHud(false), 1400);
  }, []);

  const goTo = useCallback(
    (id: string) => {
      const target = DEV_STEPS[stepIndex(id)];
      if (!target) return;
      stopVoice();
      useFlow.getState().actions.jump(target.jump);
      devAsk(id);
      setShelf(null);
      flash();
      try {
        const u = new URL(location.href);
        u.searchParams.set('step', id);
        history.replaceState(null, '', u);
      } catch {
        /* the jump still happened */
      }
    },
    [flash]
  );

  const stepBy = useCallback(
    (d: number) => {
      const i = stepIndex(useDev.getState().at);
      const next = DEV_STEPS[Math.min(DEV_STEPS.length - 1, Math.max(0, i + d))];
      if (next) goTo(next.id);
    },
    [goTo]
  );

  /* Next plays your side of the moment first: her question gets a sample answer, a check gets its yes, and she
     replies as she would. Only a moment with nothing for you to do moves on to the next one. Jumps live in the list */
  const held = useRef(false);
  const next = useCallback(() => {
    /* b23: a screen's own Next (id next) always wins over its other actions */
    const first = () => {
      const all = [...useDev.getState().actions, ...stageActions(useFlow.getState())];
      return all.find((a) => a.id === 'next') ?? all[0];
    };
    /* on the stage Next is always your turn: while she is still talking it waits for her, then answers. It never jumps
       mid-stage; only a stage that is done moves on */
    const own = useDev.getState().actions.find((a) => a.id === 'next');
    if (own) return own.run();
    if (useFlow.getState().screen === 'stage') {
      if (held.current) return;
      const eng = engine();
      if (!eng?.busy()) {
        const act = first();
        if (act) act.run();
        else if (useFlow.getState().stage?.phase === 'done') stepBy(1);
        return;
      }
      held.current = true;
      void eng.idle().then(() => {
        held.current = false;
        if (useFlow.getState().screen === 'stage') first()?.run();
      });
      return;
    }
    const act = first();
    if (act) {
      act.run();
      return;
    }
    if (useFlow.getState().screen === 'objective') return;
    stepBy(1);
  }, [stepBy]);

  const groupBy = useCallback(
    (d: number) => {
      const i = stepIndex(useDev.getState().at);
      const cur = DEV_STEPS[Math.max(0, i)];
      const first = (g?: string) => DEV_STEPS.find((x) => x.group === g);
      const g = DEV_GROUPS.indexOf(cur.group);
      /* up goes to the start of this section first, then the one before */
      const to = d < 0 && first(cur.group)?.id !== cur.id ? first(cur.group) : first(DEV_GROUPS[g + d]);
      if (to) goTo(to.id);
    },
    [goTo]
  );

  const setProject = (id: ProjectId) => {
    stopVoice();
    const now = DEV_STEPS[stepIndex(useDev.getState().at)] ?? DEV_STEPS[0];
    flowActions.jump(`${id}:${now.jump}`);
    devAsk(now.id);
    try {
      const u = new URL(location.href);
      u.searchParams.set('project', id);
      history.replaceState(null, '', u);
    } catch {
      /* the switch still happened */
    }
  };

  /* the truth follows the store */
  useEffect(() => {
    const read = (s: FlowState) => {
      const id = truth(s, useDev.getState().at);
      if (id) devMark(id);
    };
    read(useFlow.getState());
    return useFlow.subscribe(read);
  }, []);

  /* a link can land on any moment */
  useEffect(() => {
    /* b14: the same-stage link is the whole experience again, from the world map; ?step= still lands anywhere */
    const id = new URLSearchParams(location.search).get('step');
    if (id && stepIndex(id) >= 0) goTo(id);
    return () => window.clearTimeout(hudTimer.current);
  }, [goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        e.stopImmediatePropagation();
        /* Esc first stops Inspect, a second one closes the panel */
        if (useInspect.getState().on) setInspecting(false);
        else setOpen(false);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.repeat || !useDev.getState().keys) return;
      const t = e.target as HTMLElement | null;
      /* a focused panel grip (role separator) takes the arrows to resize, like a field takes them to type */
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.getAttribute('role') === 'separator');
      /* while you type, the arrows are yours. Option plus an arrow still steps */
      /* b23 (his note: "only up and down is working, not left and right"): an empty field gives the arrows back */
      const empty = !!t && /^(INPUT|TEXTAREA)$/.test(t.tagName) && !(t as HTMLInputElement).value;
      if (typing && !empty && !e.altKey) return;
      const move: Record<string, () => void> = {
        ArrowRight: () => next(),
        ArrowLeft: () => stepBy(-1),
        ArrowDown: () => groupBy(1),
        ArrowUp: () => groupBy(-1),
      };
      if (move[e.key]) {
        e.preventDefault();
        e.stopPropagation();
        move[e.key]();
        return;
      }
      if (typing || e.altKey) return;
      if (e.key.toLowerCase() === 'a') {
        const first = [...useDev.getState().actions, ...stageActions(useFlow.getState())][0];
        first?.run();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [groupBy, next, open, stepBy]);

  const dark = screen === 'stage' && !lightStage;
  const doIt = [...offered, ...stageActions({ ...useFlow.getState(), stage, screen })];
  const shown = shelf ?? step.group;

  return (
    <div className={`zdm z-root zj${dark ? ' zd' : ''}`}>
      {gear && (
        <button type="button" className="zdm-gear" data-open={open || undefined} aria-label="Developer mode" aria-expanded={open} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen((v) => !v)}>
          <Settings {...ICON} />
        </button>
      )}

      <div className="zdm-hud" data-on={(hud && !open) || undefined} aria-live="polite">
        <Ticks at={at} />
        <span className="zdm-hud-g">{step.group}</span>
        <span className="zdm-hud-l">{step.label}</span>
      </div>

      {/* a press on a field or a slider is its own; anywhere else the page keeps its focus */}
      <div
        className="zdm-wrap"
        data-open={open || undefined}
        onMouseDown={(e) => {
          if (!(e.target as HTMLElement).closest('input')) e.preventDefault();
        }}
      >
        <DialPanel className="zdm-panel">
          <div className="zdm-head">
            <div className="zdm-tabs" role="tablist" aria-label="Developer">
              <button type="button" role="tab" aria-selected={tab === 'flow'} onClick={() => setTab('flow')}>
                Flow
              </button>
              <button type="button" role="tab" aria-selected={tab === 'look'} onClick={() => setTab('look')}>
                Look
              </button>
            </div>
            <span className="zdm-count">
              {here + 1} of {DEV_STEPS.length}
            </span>
            <button type="button" className="zdm-round" aria-label="Previous moment" disabled={here <= 0} onClick={() => stepBy(-1)}>
              <ArrowLeft {...ICON} />
            </button>
            <button type="button" className="zdm-round" aria-label="Next" onClick={next}>
              <ArrowRight {...ICON} />
            </button>
          </div>

          {tab === 'look' ? (
            <LookTab />
          ) : (
            <>
              <DialRow label="Sample">
                <DialSeg<ProjectId>
                  value={projectId ?? 'spotify'}
                  options={[
                    { v: 'spotify', label: 'Spotify' },
                    { v: 'amazon', label: 'Amazon' },
                  ]}
                  onChange={setProject}
                />
              </DialRow>
              {/* b23 (his note: "an index file linked in the settings so I can go straight to any version") */}
              <DialRow label="Versions">
                <a className="zdm-link" href="/versions/" target="_blank" rel="noreferrer">
                  Every build
                  <ArrowRight {...ICON} />
                </a>
              </DialRow>
              {screen === 'stage' && (
                <>
                  <DialRow label="Her pace, fast">
                    <DialToggle
                      label="Her pace, fast"
                      on={fast}
                      onChange={(v) => {
                        setFast(v);
                        flowActions.jump(v ? 'fast' : 'slow');
                      }}
                    />
                  </DialRow>
                  <DialRow label="Background">
                    <DialSeg<StageBg>
                      value={bg}
                      options={[
                        { v: 'blue', label: 'Blue' },
                        { v: 'white', label: 'White' },
                        { v: 'grey', label: 'Grey' },
                        { v: 'warm', label: 'Warm' },
                      ]}
                      onChange={setBg}
                    />
                  </DialRow>
                  <DialRow label="Files on the left">
                    <DialToggle label="Files on the left" on={layout === 'resource-left'} onChange={(v) => setPref({ layout: v ? 'resource-left' : 'default' })} />
                  </DialRow>
                </>
              )}

              {doIt.length > 0 && (
                <div className="zdm-do">
                  {doIt.map((a, i) => (
                    <button key={a.id} type="button" className="zdm-do-b" onClick={a.run}>
                      <span>{a.label}</span>
                      {i === 0 && <kbd>A</kbd>}
                    </button>
                  ))}
                </div>
              )}

              <nav className="zdm-list" aria-label="Every moment">
                {DEV_GROUPS.map((g) => {
                  const on = shown === g;
                  return (
                    <div key={g} className="zdm-g" data-open={on || undefined}>
                      <button type="button" className="zdm-g-h" aria-expanded={on} onClick={() => setShelf(on ? '' : g)}>
                        <span>{g}</span>
                        <ChevronDown size={14} strokeWidth={1.75} />
                      </button>
                      {on &&
                        DEV_STEPS.filter((x) => x.group === g).map((x) => (
                          <button key={x.id} type="button" className="zdm-row" aria-current={x.id === at ? 'step' : undefined} onClick={() => goTo(x.id)}>
                            {x.label}
                          </button>
                        ))}
                    </div>
                  );
                })}
              </nav>

              <DialRow label="Arrow keys step">
                <DialToggle label="Arrow keys step" on={keys} onChange={(v) => setPref({ keys: v })} />
              </DialRow>
              <DialRow label="Gear">
                <DialToggle label="Gear" on={gear} onChange={(v) => setPref({ gear: v })} />
              </DialRow>
            </>
          )}
        </DialPanel>
      </div>
    </div>
  );
}
