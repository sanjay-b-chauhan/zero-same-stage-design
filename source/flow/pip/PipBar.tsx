/* The bar. Wispr Flow small: her face, then keys right beside it. No name, no level, no counts.
   Circles of one size on one even gap: her face, the mic (hold it and she sees your screen), to-dos, chat, resources, and
   Back to Zero on the far edge. I'm stuck lives in the chat's composer, so the bar has no ? of its own (his note, 2 Nov).
   To-dos and resources open their own small windows, chat opens in here. The window keeps its approved width: the middle keeps
   its room, so a moment (your voice and your words, her answer, a slot landing, her review, the coach, the one next action)
   has the same place the keys had, then they come back. In the POU the bar is the POU only: no chat, no files, no screen talk. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Check, ListChecks, Maximize2, MessageCircle, Mic, Paperclip } from 'lucide-react';
import { clock } from '../clock';
import { useFlow } from '../engine/store';
import { HeldClock } from '../stage/parts/Composer';
import Heard, { WordTail } from '../stage/parts/Heard';
import MicBars from '../stage/parts/MicBars';
import { firstName, prefersReduced, rise } from '../stage/parts/util';
import { talkPress, talkRelease, useTalk } from './talk';
import { refit, setTool, useTools, type Tool } from './toolStore';
import { closeToolWin, openToolWin, toolWin } from './toolWindows';
import { desk } from './desktop/deskStore';
import { hasComposer, shownBody, workDone } from './logic';
import { useZone, type BarAct } from './useZone';

const ICON = { size: 18, strokeWidth: 1.75 };
const TALK_KEYS = '⌃ ⌥ ⌘ Space';

/* Her face. The plain circle behind it follows her voice, and yours while she is listening. Her name is its tip */
function BarFace() {
  const manager = useFlow((s) => s.project?.manager);
  const circle = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const apply = (v: number) => {
      if (circle.current) circle.current.style.transform = `scale(${1 + Math.min(1, v) * 0.42})`;
    };
    const level = () => {
      const { ui } = useFlow.getState();
      return ui.listening ? ui.micLevel * 0.7 : ui.level;
    };
    let last = -1;
    apply(level());
    return useFlow.subscribe(() => {
      const v = level();
      if (v === last) return;
      last = v;
      apply(v);
    });
  }, []);
  return (
    <span className="zp-face zs2-face" data-tip={manager?.full} data-tip-sub="Manager" data-tip-stack="">
      <span ref={circle} className="zs2-face-circle" />
      {manager?.face ? <img className="zs2-face-img" src={manager.face} alt={manager.full} draggable={false} /> : null}
    </span>
  );
}

/* the old one lifts away, the new one rises sharp. Interruptible, nothing rebuilds the bar */
function Swap({ k, children }: { k: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const cur = useRef<HTMLDivElement>(null);
  const prev = useRef(k);
  const ghost = prev.current !== k && cur.current ? (cur.current.cloneNode(true) as HTMLElement) : null;
  useLayoutEffect(() => {
    if (prev.current === k) return;
    prev.current = k;
    const host = box.current;
    if (!host || !cur.current || prefersReduced(host)) return;
    rise(cur.current, { y: 8, blur: 4, ms: 460, delay: 40 });
    if (!ghost) return;
    ghost.setAttribute('aria-hidden', 'true');
    ghost.removeAttribute('data-tip');
    ghost.querySelectorAll('[data-tip]').forEach((n) => n.removeAttribute('data-tip'));
    ghost.classList.add('zp-swap-ghost');
    host.appendChild(ghost);
    const out = ghost.animate(
      [
        { transform: 'translateY(0)', filter: 'blur(0px)', opacity: 1 },
        { transform: 'translateY(-8px)', filter: 'blur(4px)', opacity: 0 },
      ],
      { duration: 180, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
    );
    const gone = () => ghost.remove();
    out.onfinish = gone;
    out.oncancel = gone;
  });
  return (
    <div ref={box} className="zp-swap">
      <div key={k} ref={cur} className="zp-swap-cur">
        {children}
      </div>
    </div>
  );
}

/* her answer to what you said, as she says it, while the chat is not open: the newest words hold the right edge */
function HerSay() {
  const line = useFlow((s) => {
    const st = s.stage;
    const id = s.ui.stream?.id;
    const live = id ? st?.msgs.find((m) => m.id === id) : undefined;
    if (live?.text) return live.text;
    const ms = st?.msgs ?? [];
    for (let i = ms.length - 1; i >= 0; i--) if (ms[i].from === 'her' && ms[i].text && !ms[i].sys) return ms[i].text ?? '';
    return '';
  });
  const n = useFlow((s) => s.ui.stream?.n ?? -1);
  const words = useMemo(() => line.split(/\s+/).filter(Boolean), [line]);
  return <WordTail words={words} n={n < 0 ? words.length : n} className="zp-saytail" />;
}

/* the one frame she took as you let go, as a status line: what she did, with what she saw */
function Looked() {
  const frame = useTalk((s) => s.frame);
  return (
    <span className="zp-look">
      {frame && <img className="zp-look-frame" src={frame.url} alt="" draggable={false} />}
      <span className="zp-look-tx">Viewed your screen</span>
    </span>
  );
}

/* the review wait, named by the real step she is on */
function Waiting() {
  const wait = useFlow((s) => s.stage?.wait);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = clock.setInterval(() => setNow(Date.now()), 250);
    return () => clock.clearInterval(id);
  }, []);
  if (!wait) return null;
  let t = now - wait.at;
  let label = wait.steps[wait.steps.length - 1]?.label ?? '';
  for (const s of wait.steps) {
    if (t < s.ms) {
      label = s.label;
      break;
    }
    t -= s.ms;
  }
  return (
    <span className="zp-wait" data-tip={label}>
      <span className="z4-px" aria-hidden>
        {Array.from({ length: 9 }, (_, i) => (
          <i key={i} />
        ))}
      </span>
      <span className="zp-wait-label">{label}</span>
    </span>
  );
}

function Key({
  name,
  sub,
  keys,
  on,
  dot,
  mic,
  onClick,
  onPointerDown,
  children,
}: {
  name: string;
  sub?: string;
  keys?: string;
  on?: boolean;
  dot?: boolean;
  mic?: boolean;
  onClick?: (e: ReactMouseEvent<HTMLButtonElement>) => void;
  onPointerDown?: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="zp-key"
      data-on={on || undefined}
      data-mic={mic || undefined}
      data-tip={name}
      data-tip-sub={sub}
      data-tip-keys={keys}
      aria-label={name}
      aria-pressed={on}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      {children}
      {dot && <i className="zp-dot" />}
    </button>
  );
}

export default function PipBar({ onSwitch }: { onSwitch: () => void }) {
  const open = useFlow((s) => s.ui.pipOpen);
  const body = useFlow((s) => s.ui.pipBody);
  const unread = useFlow((s) => s.stage?.unread ?? false);
  const reviewing = useFlow((s) => s.stage?.phase === 'review' && !!s.stage.wait);
  const name = useFlow((s) => firstName(s.project?.manager.name ?? ''));
  const a = useFlow((s) => s.actions);
  /* the mic is lit only while it is taking your words. Once you let go it is her turn, and her face carries that */
  const talking = useTalk((s) => s.phase === 'listening');
  const zone = useZone(open);
  const pou = useFlow((s) => s.stage?.phase === 'pou');

  const todosWin = useTools((t) => t.todos);
  const resWin = useTools((t) => t.resources);
  const onChat = open && body === 'chat';
  /* the body has its own place for your words: the chat's box (gone once the work is done) or the POU's hold slab */
  const boxHere = useFlow((s) => {
    const ph = s.stage?.phase ?? 'work';
    const shown = shownBody(s.ui.pipBody, ph, s.stage?.submitOpen ?? false);
    return shown === 'pou' || hasComposer(shown, ph, workDone(s.stage));
  });
  const onRes = resWin || (open && body === 'resources');
  const onWork = todosWin || (open && body === 'slots');

  /* tap the one you are on and the window folds back to the bar. Any press springs the window to that view's size,
     so on a window you sized by hand the first tap only springs it back */
  const toggle = (b: 'chat' | 'resources' | 'slots') => {
    const pulled = useTools.getState().pulled;
    refit();
    if (open && body === b) {
      if (!pulled) a.setPipOpen(false);
      return;
    }
    a.setPipBody(b);
    a.setPipOpen(true);
  };

  /* To-dos and Resources: their own window beside this one, opened in this press. On the fake desktop they are panels that open
     out of the PiP. A refused popup keeps them in here */
  /* b23 (his note: "when I am clicking on resources, it should open up on that part only, at the top, not at the bottom"): on
     the desktop they open inside the PiP, in the same place the chat does */
  const tool = (t: Tool, e: ReactMouseEvent<HTMLButtonElement>) => {
    if (desk.on) {
      if (useTools.getState()[t]) setTool(t, false);
      toggle(t === 'todos' ? 'slots' : 'resources');
      return;
    }
    const win = e.currentTarget.ownerDocument.defaultView ?? window;
    if (win !== window) {
      if (toolWin(t)) {
        closeToolWin(t);
        setTool(t, false);
        return;
      }
      const other: Tool = t === 'todos' ? 'resources' : 'todos';
      if (openToolWin(t, win, toolWin(other) ? 1 : 0)) {
        setTool(t, true);
        return;
      }
    }
    toggle(t === 'todos' ? 'slots' : 'resources');
  };

  const act = (what: BarAct) => {
    if (what === 'submit') {
      a.openSubmit();
      a.setPipBody('slots');
      a.setPipOpen(true);
    } else if (what === 'resubmit') {
      a.resubmit();
      a.setPipBody('slots');
      a.setPipOpen(true);
    } else if (what === 'fixes') {
      a.setPipBody('slots');
      a.setPipOpen(true);
    } else if (what === 'pou') {
      a.startPou();
      a.setPipBody('slots');
      a.setPipOpen(true);
    } else if (what === 'next') {
      /* the next stage starts from the objective, where its tick and Start wait */
      a.setSurface('big');
      a.goto('objective');
    } else {
      a.goto('objective');
    }
  };

  /* the mic and the keys share one rule: press starts or sends, a held press sends when you let go */
  const talkDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const doc = e.currentTarget.ownerDocument;
    const win = doc.defaultView ?? window;
    talkPress(win);
    const up = () => {
      doc.removeEventListener('pointerup', up);
      doc.removeEventListener('pointercancel', up);
      talkRelease(win);
    };
    doc.addEventListener('pointerup', up);
    doc.addEventListener('pointercancel', up);
  };

  let middle: ReactNode;
  if (zone.kind === 'listen') {
    /* b14 (his note: a flat line and 0:04 "reads as dead"): your words as she hears them, over your voice and the time.
       With the chat's box or the POU's slab open, your words land there, so the bar keeps only your voice and the time */
    middle = open && boxHere ? (
      <span className="zp-listen" aria-label="Listening">
        <span className="zp-listen-row">
          <MicBars bars={22} />
          <HeldClock />
        </span>
      </span>
    ) : (
      <span className="zp-listen" data-heard="" aria-label="Listening">
        <Heard className="zp-heard" />
        <span className="zp-listen-row">
          <MicBars bars={22} />
          <HeldClock />
        </span>
      </span>
    );
  } else if (zone.kind === 'look') {
    middle = <Looked />;
  } else if (zone.kind === 'say') {
    middle = (
      <button type="button" className="zp-say" aria-label={`Open the chat with ${name}`} onClick={() => toggle('chat')}>
        <HerSay />
      </button>
    );
  } else if (zone.kind === 'land') {
    middle = (
      <button type="button" className="zp-land" data-tip={zone.label} onClick={() => toggle('slots')}>
        <span className="zp-land-tx">
          <span className="zp-land-tick" data-verified={zone.verified || undefined} aria-hidden>
            <Check size={9} strokeWidth={2.75} />
          </span>
          {zone.label}
        </span>
      </button>
    );
  } else if (zone.kind === 'coach') {
    middle = (
      <button type="button" className="zp-land zp-coach" onClick={() => toggle('slots')}>
        <img src={zone.face} alt="" draggable={false} />
        <span className="zp-land-tx">{zone.name}</span>
      </button>
    );
  } else if (zone.kind === 'act') {
    middle = (
      <button type="button" className="zp-act" data-act={zone.act} data-tip={zone.full} onClick={() => act(zone.act)}>
        {zone.label}
      </button>
    );
  } else if (reviewing) {
    middle = <Waiting />;
  } else {
    middle = null;
  }
  /* the bar is one size. A moment (your voice, a slot landing, the next key, her review) takes the tools' place, then they come back */
  const moment = middle !== null;

  const tools = pou ? (
    <Key name="Check your understanding" sub={`${name} asks, you answer`} on={open && body === 'slots'} onClick={() => toggle('slots')}>
      <ListChecks {...ICON} />
    </Key>
  ) : (
    <>
      <Key name="Slots" on={onWork} onClick={(e) => tool('todos', e)}>
        <ListChecks {...ICON} />
      </Key>
      <Key name={`Chat with ${name}`} sub={unread && !onChat ? `New from ${name}` : undefined} on={onChat} dot={unread && !onChat} onClick={() => toggle('chat')}>
        <MessageCircle {...ICON} />
      </Key>
      <Key name="Resources" on={onRes} onClick={(e) => tool('resources', e)}>
        <Paperclip {...ICON} />
      </Key>
    </>
  );

  return (
    <div className="zp-bar" data-pou={pou || undefined}>
      <div className="zp-keys">
        <BarFace />
        {!pou && (
          <Key
            name="Talk with your screen"
            keys={TALK_KEYS}
            mic
            on={talking}
            onPointerDown={talkDown}
            onClick={(e) => {
              /* Enter on the focused key: a press with no pointer */
              if (e.detail === 0) talkPress(e.currentTarget.ownerDocument.defaultView ?? window);
            }}
          >
            <Mic {...ICON} />
          </Key>
        )}
        <div className="zp-zone" data-kind={moment ? zone.kind : 'tools'} data-pou={pou || undefined}>
          <Swap k={moment ? (zone.kind === 'who' ? 'wait' : zone.key) : 'tools'}>{moment ? middle : tools}</Swap>
        </div>
        <Key name="Back to Zero" sub="The full stage" onClick={onSwitch}>
          <Maximize2 {...ICON} />
        </Key>
      </div>
    </div>
  );
}
