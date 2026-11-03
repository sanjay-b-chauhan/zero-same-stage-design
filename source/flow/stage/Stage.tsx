/* The stage. Project, then stage, then step, then slot, readable at a glance.
   Everything that talks to the store is a part in ./parts, shared with the PIP. This file only lays them out for the big screen.
   The top row is the stage you are on, its number in a pill and its name (his note, 2 Nov: no logo there), every stage on
   hover, then an empty box the Level and coach pill centres on.
   The stage is dark by default, light from developer mode. The work sits on the ground with no outline (a dev toggle brings
   it back), the composer is the one filled thing. The line between the work and the chat drags (his note, 2 Nov).
   The files key at the end of the work's title row opens Resources; her name card is her face and name, nothing else.
   A dev switch puts the files on the far left, the chat in the middle and the slots on the right. */
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, PictureInPicture2 } from 'lucide-react';
import { softClick, stopVoice } from '../audio';
import { useDev } from '../dev/store';
import { useFlow } from '../engine/store';
import type { ProjectMeta } from '../types';
import './stage.css';
import PipRoot from '../pip/PipRoot';
import Celebrate from './parts/Celebrate';
import { useCele } from './parts/celeStore';
import CoachCard from './parts/CoachCard';
import Composer from './parts/Composer';
import Face from './parts/Face';
import FeedbackList from './parts/FeedbackList';
import { stopFilm } from './parts/FilmPlayer';
import Grip from './parts/Grip';
import { keepComposerAt, PouFoot } from './parts/PouPanel';
import Preview from './parts/Preview';
import ResourcesList from './parts/ResourcesList';
import SlotBoard from './parts/SlotBoard';
import SubmitArea from './parts/SubmitArea';
import Thread from './parts/Thread';
import { useColumns } from './parts/useColumns';
import { useSidePanel } from './parts/sideStore';
import { useHold } from './parts/useHold';
import { pop, rise } from './parts/util';

const ICON = { size: 16, strokeWidth: 1.75 };
const LANDING_MS = 1600;
const STAMP_X = 24;
const MENU_OPEN_MS = 80; /* a pointer passing over on its way to Back does not open it */
const MENU_CLOSE_MS = 180; /* time for the pointer to travel from the name into the list */

/* Back asks first, the same b36 dialog as leaving the meeting. Exit keeps every slot and message: the map card picks it up */
function ExitDialog({ onStay, onExit }: { onStay: () => void; onExit: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const stayKey = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    rise(box.current, { y: 12, scale: 0.96, blur: 6, ms: 520 });
    stayKey.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      onStay();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onStay]);
  return (
    <div
      className="zj-scrim zs2-exit-scrim"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onStay();
      }}
    >
      <div ref={box} className="zj-dialog zs2-exit" role="dialog" aria-modal="true" aria-labelledby="zs2-exit-t">
        <h2 id="zs2-exit-t">Exit the stage?</h2>
        <div className="zs2-exit-k">
          <button ref={stayKey} type="button" className="zk3 zs2-k-quiet" data-size="s" onClick={onStay}>
            Stay
          </button>
          <button type="button" className="zk3" data-size="s" onClick={onExit}>
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

/* The stage you are on: its number in a pill, then its name. Hover or focus opens what we are chasing, the project's own
   title, then the stages as one path down a rail (his note, b14: "a title for this, what we are chasing, and then a vertical
   progression"): done ones ticked, this one filled, the rest quiet rings. The path grows out of the pill on the spring, blur
   to sharp, and stays a beat after the pointer leaves so it can travel into it. A stage only opens once the last one is done */
function StageMenu({ project }: { project: ProjectMeta }) {
  const at = useFlow((s) => Math.max(0, project.stages.findIndex((x) => x.id === s.stage?.stageId)));
  const meta = project.stages[at];
  const [open, setOpen] = useState(false);
  const timer = useRef(0);
  const word = useRef<HTMLSpanElement>(null);
  const first = useRef(true);
  const id = useId();
  const later = (v: boolean, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(v), ms);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  /* a new stage: its name rises in where the last one was */
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    rise(word.current, { y: 8, blur: 6, ms: 560 });
  }, [at]);
  if (!meta) return null;
  return (
    <div
      className="zs2-stages"
      data-open={open || undefined}
      onPointerEnter={(e) => e.pointerType === 'mouse' && later(true, MENU_OPEN_MS)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && later(false, MENU_CLOSE_MS)}
      onFocus={() => later(true, 0)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) later(false, 0);
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !open) return;
        e.stopPropagation();
        later(false, 0);
      }}
    >
      <button
        type="button"
        className="zs2-stages-key"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Stage ${at + 1} of ${project.stages.length}, ${meta.title}. Every stage`}
        onClick={() => later(true, 0)}
      >
        <span className="zs2-stages-pill z-num">
          {at + 1}
          <span className="zs2-stages-of">/{project.stages.length}</span>
        </span>
        <span ref={word} className="zs2-stages-name">
          {meta.title}
        </span>
        <ChevronDown className="zs2-stages-chev" size={14} strokeWidth={2} aria-hidden />
      </button>
      <div id={id} className="zs2-stages-pop" role="group" aria-label="Every stage">
        <p className="zs2-stages-goal">{project.title}</p>
        <ol className="zs2-path">
          {project.stages.map((st, i) => {
            const state = i < at ? 'done' : i === at ? 'now' : 'next';
            return (
              <li
                key={st.id}
                className="zs2-path-row"
                data-state={state}
                style={{ '--i': i } as React.CSSProperties}
                aria-current={state === 'now' ? 'step' : undefined}
                aria-label={`${i + 1}, ${st.title}, ${st.minutes} minutes, ${state === 'done' ? 'done' : state === 'now' ? 'you are here' : 'locked'}`}
              >
                <span className="zs2-path-node z-num" aria-hidden>
                  {state === 'done' ? <Check size={16} strokeWidth={2.75} /> : i + 1}
                </span>
                <span className="zs2-path-t">{st.title}</span>
                <span className="zs2-path-min z-num">{st.minutes} min</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function TopBar({ project }: { project: ProjectMeta }) {
  const goto = useFlow((s) => s.actions.goto);
  const setSurface = useFlow((s) => s.actions.setSurface);
  const [asking, setAsking] = useState(false);
  return (
    <header className="zs2-top" data-enter="top">
      <div className="zs2-top-l">
        <button
          type="button"
          className="zs2-ghost"
          aria-label="Exit the stage"
          data-tip="Exit"
          onClick={() => {
            softClick();
            setAsking(true);
          }}
        >
          <ChevronLeft {...ICON} />
        </button>
        <StageMenu project={project} />
      </div>
      <div className="zs2-top-r">
        <button type="button" className="zs2-ghost" aria-label="Small window" data-tip="Small window" onClick={() => setSurface('pip')}>
          <PictureInPicture2 {...ICON} />
        </button>
        <span className="zs2-hud-anchor" data-hud-anchor aria-hidden />
      </div>
      {asking && (
        <ExitDialog
          onStay={() => {
            softClick();
            setAsking(false);
          }}
          onExit={() => {
            softClick();
            setAsking(false);
            stopVoice();
            stopFilm();
            goto('world');
          }}
        />
      )}
    </header>
  );
}

/* the slots stay in the POU too: they are your work, and you read them while you explain it */
function WorkView() {
  const phase = useFlow((s) => s.stage?.phase ?? 'work');
  const view = phase === 'feedback' ? 'feedback' : 'slots';
  const el = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    rise(el.current, { y: 10, blur: 6, ms: 560 });
  }, [view]);
  /* the slots are numbered sections, and the hand in is the last of them. Feedback keeps its key under the list */
  return (
    <div ref={el} key={view} className="zs2-work-view">
      {view === 'slots' && <SlotBoard surface="big" submit={<SubmitArea surface="big" />} />}
      {view === 'feedback' && (
        <>
          <FeedbackList surface="big" />
          <SubmitArea surface="big" />
        </>
      )}
      <CoachCard surface="big" />
    </div>
  );
}

/* b20 (his note, 3 Nov: "there should be To-dos and Resources tabs on the left, so we can see the to-dos and resources
   there only, and when clicked it opens on the right side ... the issues and resources should be shown from the start"):
   two plain words over the work, the one you are on in a thin outline pill. A file you click opens on the right */
type WorkTab = 'todo' | 'res';
function Work({ pinned }: { project: ProjectMeta; pinned: boolean }) {
  const [tab, setTab] = useState<WorkTab>('todo');
  const files = useFlow((s) => s.stage?.files.filter((f) => !f.mine).length ?? 0);
  const view = useRef<HTMLDivElement>(null);
  const pick = (t: WorkTab) => {
    if (t === tab) return;
    softClick();
    setTab(t);
  };
  useLayoutEffect(() => {
    rise(view.current, { y: 8, blur: 6, ms: 460 });
  }, [tab]);
  return (
    <section className="zs2-panel zs2-work" data-enter="work">
      <div className="zs2-work-in">
        <div className="zs2-wtabs" role="tablist" aria-label="Your work">
          <button type="button" role="tab" aria-selected={tab === 'todo'} onClick={() => pick('todo')}>
            To-dos
          </button>
          <button type="button" role="tab" aria-selected={tab === 'res'} onClick={() => pick('res')}>
            Resources
            {files > 0 && <span className="zs2-wtabs-n z-num">{files}</span>}
          </button>
        </div>
        <div ref={view} key={tab} className="zs2-work-scroll">
          {tab === 'todo' ? <WorkView /> : <ResourcesList surface="big" pinned={pinned} bare />}
        </div>
      </div>
    </section>
  );
}

/* her name card on the chat's own column: her face and her name. Nothing else up here */
function ManagerHead({ project }: { project: ProjectMeta }) {
  return (
    <div className="zs2-head">
      <div className="b-who">
        <Face size={32} />
        <span className="b-who-t">
          <span className="b-who-n">{project.manager.full}</span>
        </span>
      </div>
    </div>
  );
}

/* one thread the whole stage: the POU only changes what sits under it */
function Chat({ project }: { project: ProjectMeta }) {
  const phase = useFlow((s) => s.stage?.phase ?? 'work');
  const room = phase === 'pou' || phase === 'done';
  const said = useFlow((s) => (s.stage?.pou.lines.length ?? 0) > 0);
  const box = useRef<HTMLElement>(null);
  /* the moment the POU begins, before React redraws: where the composer is, so the hold grows out of it */
  useEffect(
    () =>
      useFlow.subscribe((s, p) => {
        if (s.stage?.phase === 'pou' && p.stage?.phase !== 'pou') keepComposerAt(box.current?.querySelector('.zs2-composer-box')?.getBoundingClientRect() ?? null);
      }),
    []
  );
  return (
    <section ref={box} className="zs2-panel zs2-chat" data-enter="chat">
      <ManagerHead project={project} />
      <Thread surface="big" />
      {room ? (
        said && <PouFoot />
      ) : (
        <div className="zs2-chat-foot">
          <Composer surface="big" />
        </div>
      )}
    </section>
  );
}

/* slides in and pushes, chat stays usable. Keeps its content while it slides away.
   Pinned (the files on the left), it holds what she sent and comes in with her first file, so it is never an empty box */
/* what the side panel holds now, or nothing */
function useSideOpen(pinned: boolean) {
  const side = useFlow((s) => s.ui.bigSide);
  const hasFiles = useFlow((s) => (s.stage?.files.some((f) => !f.mine) ?? false));
  const resHidden = useSidePanel((p) => p.resHidden);
  return pinned ? (side === 'preview' ? 'preview' : hasFiles && (side === 'resources' || !resHidden) ? 'resources' : null) : side;
}

function Side({ pinned }: { pinned: boolean }) {
  const want = useSideOpen(pinned);
  const [shown, setShown] = useState(want);
  const panel = useRef<HTMLDivElement>(null);
  const was = useRef(want);
  useEffect(() => {
    if (want) setShown(want);
  }, [want]);
  /* the list and the file swap in place when pinned: the new one lands sharp from a blur */
  useLayoutEffect(() => {
    if (pinned && was.current && want && was.current !== want) rise(panel.current, { y: 6, blur: 6, ms: 460 });
    was.current = want;
  }, [want, pinned]);
  return (
    <aside
      className="zs2-sidewrap"
      data-open={want ? '' : undefined}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && !want) setShown(null);
      }}
    >
      <div ref={panel} className="zs2-panel zs2-sidewrap-in">
        {shown === 'preview' && <Preview surface="big" />}
        {shown === 'resources' && <ResourcesList surface="big" pinned={pinned} />}
      </div>
    </aside>
  );
}

/* the build stamp sits in the chat's free corner, wherever the chat is */
function useStampX(body: React.RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const el = body.current;
    const root = el?.ownerDocument.documentElement;
    if (!el || !root) return;
    const place = () => {
      const chat = el.querySelector('.zs2-chat');
      if (chat) root.style.setProperty('--zs2-stamp-x', `${Math.round(chat.getBoundingClientRect().left + STAMP_X)}px`);
    };
    place();
    const ro = new ResizeObserver(place);
    el.querySelectorAll(':scope > *').forEach((n) => ro.observe(n));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty('--zs2-stamp-x');
    };
  }, [body]);
}

export default function Stage() {
  const project = useFlow((s) => s.project);
  const hasStage = useFlow((s) => !!s.stage);
  const startedAt = useFlow((s) => s.stage?.startedAt ?? 0);
  const small = useFlow((s) => s.ui.surface === 'pip');
  const light = useFlow((s) => s.ui.lightStage);
  const cele = useCele((c) => c.on);
  const layout = useDev((s) => s.layout);
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const landing = useRef(Date.now() - startedAt < LANDING_MS);
  const sideKind = useFlow((s) => (s.ui.bigSide === 'preview' ? 'preview' : 'res'));
  const left = layout === 'resource-left';
  /* with the files on the left the work sits on the right, so a drag to the right makes it narrower */
  const grip = useColumns(body, sideKind, left);
  const sideOpen = useSideOpen(left);

  useHold(root);
  useStampX(body);

  /* Esc closes the third panel */
  useEffect(() => {
    const doc = root.current?.ownerDocument;
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const { ui, actions } = useFlow.getState();
      if (ui.bigSide && !ui.listening) actions.closeSide();
    };
    doc.addEventListener('keydown', onKey);
    return () => doc.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => stopFilm, []);

  /* the room arrives on its ground: the bar, the work, the chat */
  useLayoutEffect(() => {
    if (!landing.current) return;
    landing.current = false;
    root.current?.querySelectorAll('[data-enter]').forEach((el, i) => {
      rise(el, { y: 18, scale: 0.98, blur: 0, delay: i * 90, ms: 460 });
    });
  }, []);

  /* a layout switch: each column lands in its new place */
  const lastLayout = useRef(layout);
  useLayoutEffect(() => {
    if (lastLayout.current === layout) return;
    lastLayout.current = layout;
    body.current?.querySelectorAll(':scope > .zs2-panel, :scope > .zs2-sidewrap').forEach((el) => pop(el, 0.97));
  }, [layout]);

  return (
    <div ref={root} className={`zs2 ${light ? 'z-light' : 'zd'}`} data-stuck={useFlow((s) => s.stage?.stuckMode) ? '1' : undefined}>
      {project && hasStage && (
        <div className="zs2-frame" data-cele={cele || undefined}>
          <TopBar project={project} />
          <div ref={body} className="zs2-body" data-layout={layout}>
            <Work project={project} pinned={left} />
            <Grip label="Resize the work and the chat" {...grip} />
            <Chat project={project} />
            {sideOpen && <Grip label="Resize the files" for="side" {...grip.side} />}
            <Side pinned={left} />
          </div>
        </div>
      )}
      <Celebrate root={root} />
      {small && <PipRoot />}
    </div>
  );
}
