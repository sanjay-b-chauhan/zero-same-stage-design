/* The PIP. One React tree with the big stage, portalled into the real window (?pip=real), or by default onto a fake macOS
   desktop on this page, where it floats above the work apps and drags anywhere.
   Closed it is one small bar. Open something and the window grows to fit it, close it and it goes back. Mounted by Stage.tsx while ui.surface is 'pip'. */
import './pip.css';
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useFlow } from '../engine/store';
import type { PipBody as PipBodyName } from '../types';
import { pauseFilm } from '../stage/parts/FilmPlayer';
import { useHold } from '../stage/parts/useHold';
import Desktop, { PIP_ENTER_DELAY_MS } from './desktop/Desktop';
import { setFront } from './desktop/deskStore';
import { DESK_AREA } from './desktop/geometry';
import Dock from './Dock';
import { useTune } from '../dev/tune';
import { naturalH } from './natural';
import ToolWindow from './ToolWindow';
import { closeTools, forgetSize, pulledSize, rememberSize, setPulled, useTools } from './toolStore';
import { clampSize, isMeasured, isWide, LIMITS, shownBody, sizeFor, STAMP_H, TALL_AT, type ShownBody, type Size } from './logic';
import PipBar from './PipBar';
import PipBody from './PipBody';
import Pops from './Pops';
import { usePipWindow, type PipHost } from './usePipWindow';

const OWN_FIT_MS = 500; /* resize events from our own resizeTo are not the person dragging the edge */

function HoldHere({ host }: { host: RefObject<HTMLElement | null> }) {
  useHold(host);
  return null;
}

/* what a measured body holds, at its natural height, plus the action area under it */
const measure = (root: HTMLElement | null, shown: ShownBody, real: boolean): number | undefined => {
  const body = root?.querySelector<HTMLElement>('.zp-body');
  if (!root || !body) return undefined;
  const inner = shown === 'resources' ? body.querySelector<HTMLElement>('.zs2-res') : body.querySelector<HTMLElement>('.zp-scroll');
  if (!inner) return undefined;
  const action = root.querySelector<HTMLElement>('.zp-action');
  return naturalH(inner) + (action ? naturalH(action) : 0) + (real ? STAMP_H : 0);
};

const sameSize = (a: Size, b: Size) => a.w === b.w && a.h === b.h;

/* The window grows only on a click: the size is worked out once per thing you open, in the same task as the click. */
function useWindowSize(host: PipHost, root: RefObject<HTMLDivElement | null>, back: RefObject<PipBodyName>) {
  const open = useFlow((s) => s.ui.pipOpen);
  const body = useFlow((s) => s.ui.pipBody);
  const phase = useFlow((s) => s.stage?.phase ?? 'work');
  const submitOpen = useFlow((s) => s.stage?.submitOpen ?? false);
  const a = useFlow((s) => s.actions);
  const shown = shownBody(body, phase, submitOpen);
  const real = host.mode === 'real';
  const { mode, win, fit, sameAsWindow } = host;
  const fitN = useTools((t) => t.fitN);
  /* a key press counts even on the view you are on: it springs a window you pulled back to its view's size */
  const key = `${mode}|${open ? shown : 'bar'}|${fitN}`;

  const [size, setSize] = useState<Size>(() => sizeFor(false, 'chat'));
  const target = useRef<Size>(size);
  const lastKey = useRef('');
  const lastFit = useRef(0);
  const owed = useRef(false);
  const skip = useRef(false);

  const lastSeen = useRef({ shown: '', fitN: 0 });
  const work = (): Size => {
    if (open) {
      /* the key of the view you are on springs it back: that view forgets the size you pulled it to */
      if (fitN !== lastSeen.current.fitN && shown === lastSeen.current.shown) forgetSize(shown);
      lastSeen.current = { shown, fitN };
      const kept = mode === 'real' ? undefined : pulledSize(shown);
      if (kept) return clampSize(kept, LIMITS[shown]);
    } else lastSeen.current = { shown: '', fitN };
    return sizeFor(open, shown, open && isMeasured(shown) ? measure(root.current, shown, real) : undefined);
  };

  /* runs after the body's own layout, so the body is already there to be measured */
  useLayoutEffect(() => {
    if (key === lastKey.current) return;
    lastKey.current = key;
    const next = work();
    target.current = next;
    setSize((prev) => (sameSize(prev, next) ? prev : next));
    if (mode !== 'real' || !win) return;
    if (skip.current) {
      skip.current = false;
      return;
    }
    owed.current = false;
    if (sameAsWindow(next)) return;
    lastFit.current = Date.now();
    if (fit(next)) return;
    /* no click behind this change: the state goes back to what the window is, and the next click settles it */
    owed.current = true;
    const tall = win.innerHeight > TALL_AT;
    const { ui } = useFlow.getState();
    if (tall !== ui.pipOpen) {
      skip.current = true;
      a.setPipOpen(tall);
    }
    if (ui.pipBody === 'preview') a.setPipBody(back.current);
  });

  /* the person dragged the window edge: the state follows */
  useEffect(() => {
    if (mode !== 'real' || !win) return;
    const onResize = () => {
      if (Date.now() - lastFit.current < OWN_FIT_MS) return;
      const tall = win.innerHeight > TALL_AT;
      setPulled(tall);
      if (tall !== useFlow.getState().ui.pipOpen) {
        skip.current = true;
        a.setPipOpen(tall);
      }
    };
    win.addEventListener('resize', onResize);
    return () => win.removeEventListener('resize', onResize);
  }, [mode, win, a]);

  /* Esc or a film ending can't resize, there is no click behind them. The next click, anywhere, settles what they owe. */
  const settle = () => {
    if (!owed.current || !win) return;
    owed.current = false;
    const now = target.current;
    if (sameAsWindow(now)) return;
    lastFit.current = Date.now();
    fit(now);
  };

  return { size, settle, fitN, limits: open ? LIMITS[shown] : null, view: open ? shown : null };
}

/* The checklist and the POU take over the work tab when the stage gets there. A preview you opened stays yours, except the POU:
   it takes the whole small window while it runs. */
function useBodyFollowsStage(back: RefObject<PipBodyName>) {
  const phase = useFlow((s) => s.stage?.phase ?? 'work');
  const submitOpen = useFlow((s) => s.stage?.submitOpen ?? false);
  const body = useFlow((s) => s.ui.pipBody);
  const filmId = useFlow((s) => s.ui.filmId);
  const open = useFlow((s) => s.ui.pipOpen);
  const setPipBody = useFlow((s) => s.actions.setPipBody);
  const setPipOpen = useFlow((s) => s.actions.setPipOpen);

  useEffect(() => {
    if (!isWide(body)) back.current = body;
  }, [body, back]);

  /* A No plays the explainer right there. Her voice never runs without its picture. */
  useEffect(() => {
    if (!filmId) return;
    setPipBody('film');
    setPipOpen(true);
  }, [filmId, setPipBody, setPipOpen]);

  /* and when you leave the picture, her voice waits for you */
  const watching = open && body === 'film';
  const wasWatching = useRef(false);
  useEffect(() => {
    if (wasWatching.current && !watching) pauseFilm();
    wasWatching.current = watching;
  }, [watching]);

  useEffect(() => {
    const now = useFlow.getState().ui.pipBody;
    /* the POU takes the small window over, whatever it was showing, and opens it */
    if (phase === 'pou') {
      setPipBody('slots');
      setPipOpen(true);
      return;
    }
    if (isWide(now)) return;
    if (phase === 'feedback') setPipBody('slots');
    else if (phase === 'review' || phase === 'approved' || phase === 'done') setPipBody('chat');
  }, [phase, setPipBody, setPipOpen]);

  useEffect(() => {
    if (submitOpen) setPipBody('slots');
  }, [submitOpen, setPipBody]);
}

function Shell({ host }: { host: PipHost }) {
  const root = useRef<HTMLDivElement>(null);
  const back = useRef<PipBodyName>('chat');
  const open = useFlow((s) => s.ui.pipOpen);
  const body = useFlow((s) => s.ui.pipBody);
  const light = useFlow((s) => s.ui.lightStage);
  /* stuck mode is the stage's, so the PiP takes its colours too */
  const stuck = useFlow((s) => s.stage?.stuckMode ?? false);
  const a = useFlow((s) => s.actions);
  const real = host.mode === 'real';
  useBodyFollowsStage(back);
  const { size, settle, fitN, limits, view } = useWindowSize(host, root, back);
  /* b20 (his note: "increase by 1x, 2x, 3x"): developer mode scales the whole window; the frame grows by k, the window inside is zoomed by k */
  const k = Math.max(0.5, Number(useTune((t) => t.values['pip-scale'] ?? 100)) / 100);
  const by = (z: { w: number; h: number }, f: number) => ({ w: Math.round(z.w * f), h: Math.round(z.h * f) });
  const shownSize = k === 1 ? size : by(size, k);
  const shownLimits = !limits || k === 1 ? limits : { min: by(limits.min, k), max: by(limits.max, k) };
  const todos = useTools((t) => t.todos);
  const resources = useTools((t) => t.resources);
  useEffect(() => closeTools, []);

  useEffect(() => {
    if (!isWide(body)) return;
    const doc = root.current?.ownerDocument;
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) a.setPipBody(back.current);
    };
    doc.addEventListener('keydown', onKey);
    return () => doc.removeEventListener('keydown', onKey);
  }, [body, a]);

  /* The way back. Focus is only the opener's to take, and this click is what lets it. */
  const onSwitch = () => {
    try {
      window.focus();
    } catch {
      /* the tab stays where it is, the state still goes back */
    }
    /* zooming out of a file keeps the file in front of you */
    const { pipBody, previewFileId } = useFlow.getState().ui;
    a.setSurface('big');
    if (pipBody === 'preview' && previewFileId) a.openFile(previewFileId);
  };

  /* A click leaves no focus behind, so a held Space always talks and never presses the key you last clicked. */
  const letGo = (e: MouseEvent<HTMLDivElement>) => {
    if (e.detail > 0) (e.target as Element).closest<HTMLButtonElement>('button')?.blur();
    settle();
  };

  const tree = (
    <div
      ref={root}
      className={`zp z-root zj zs2 ${light ? 'z-light' : 'zd'}`}
      data-mode={host.mode}
      data-stuck={stuck ? '1' : undefined}
      data-open={open || undefined}
      onClick={letGo}
    >
      {real && <HoldHere host={root} />}
      <PipBar onSwitch={onSwitch} />
      {open && <PipBody real={real} onClosePreview={() => a.setPipBody(back.current)} />}
      <Pops root={root} />
    </div>
  );

  /* to-dos and resources each in their own window beside the real PiP. On the desktop they are its panels */
  const tools = real && (
    <>
      {todos && <ToolWindow tool="todos" />}
      {resources && <ToolWindow tool="resources" />}
    </>
  );

  return real ? (
    <>
      {tree}
      {tools}
    </>
  ) : (
    <Desktop>
      <Dock size={shownSize} fitN={fitN} limits={shownLimits} area={DESK_AREA} enterDelay={PIP_ENTER_DELAY_MS} onGrab={() => setFront('zero')} onPulled={(s) => view && rememberSize(view, by(s, 1 / k))}>
        {tree}
      </Dock>
    </Desktop>
  );
}

export default function PipRoot() {
  const host = usePipWindow();
  if (host.mode === 'opening') return null;
  if (host.mode === 'real') return host.mount ? createPortal(<Shell host={host} />, host.mount) : null;
  return createPortal(<Shell host={host} />, document.body);
}
