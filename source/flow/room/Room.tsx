/* One surface for the kickoff, the breakdown and the objective: b36's film page, light. Same DOM, the mode changes,
   nothing remounts. The back key and the title sit over the film's left edge, the film is the one filled surface, her face
   sits in its corner. Her notes slide in beside the film after her hello; a chapter that teaches ends on "Are we clear?" on
   the bar. After the meeting the film grows to the page for the check-in, then the plan.
   b11: at rest the film shows only its progress line; the controls rise on a grey gradient while the pointer is over it.
   After her hello she asks "Ready to take notes?"; Okay closes her video into a circle that lands in the corner, then the
   notes come in. At the end her corner face flies up into the check-in's meter and the check-in starts on its own. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ChevronLeft, Pause, Play } from 'lucide-react';
import { useDev, useDevAction, useDevGo } from '../dev/store';
import { takeRect } from '../ds/handoff';
import { useFlow } from '../engine/store';
import { isTextEntry, prefersReduced, rise, SPRING, SPRING_MS } from '../stage/parts/util';
import type { ProjectId, Screen } from '../types';
import { useCaption } from './caption';
import { kick, kickBegin, kickFinished, kickLand, kickNudge, kickPause, kickPlay, kickReady, kickReplay, kickSeek, kickSetup, kickStop, kickToggle, useKick } from './kickoff';
import { CheckIn, ReadyCard } from './KickCard';
import { pouEnter, pouFaceTake, pouLand, pouStop } from './pou';
import PouView, { PouMeter } from './pou/PouView';
import { flyFace } from './pou/fly';
import PlanView from './plan/PlanView';
import Player from './Player';
import { sfx, usePrefs } from './prefs';
import { capIndexAt, capsOfText, litAt, type Cap } from './timeline';
import { NotesPanel } from './notes/Notes';
import SystemFilm from './SystemFilm';
import Walk from './Walk';
import Join, { openFrom } from './Join';
import './room.css';

type Mode = 'kickoff' | 'pou' | 'breakdown' | 'objective';
const isFilm = (m: Mode) => m === 'kickoff';
/* b18: the breakdown lives on the objective now, so a way into the breakdown lands there */
const modeOf = (s: Screen): Mode => (s === 'kickoff' || s === 'pou' ? s : 'objective');

/* test rails, nothing on screen */
const rail: { mounts?: number; [k: string]: unknown } = {
  kick: useKick,
  seek: kickSeek,
  play: kickPlay,
  pause: kickPause,
  total: () => kick.total(),
  dev: useDev,
  prefs: usePrefs,
  film: true,
};
(window as unknown as { __room?: unknown }).__room = rail;

/* her caption, one short line at a time, the word she is on lit. Patched straight to the DOM, never rebuilt per frame */
function Caption({ film, show }: { film: boolean; show: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let key = '';
    let spans: HTMLElement[] = [];
    const draw = (words: string[], lit: number, k: string) => {
      if (k !== key) {
        key = k;
        el.textContent = '';
        spans = [];
        if (words.length) {
          const line = document.createElement('span');
          words.forEach((w, i) => {
            if (i) line.append(' ');
            const it = document.createElement('i');
            it.textContent = w;
            line.append(it);
            spans.push(it);
          });
          el.append(line);
        }
      }
      spans.forEach((s, i) => {
        const on = i < lit ? '1' : '0';
        if (s.dataset.on !== on) s.dataset.on = on;
      });
    };
    if (film) {
      const paint = () => {
        const { seg, t, phase } = useKick.getState();
        const caps = kick.caps()[seg] ?? [];
        const k = phase === 'play' ? capIndexAt(caps, t) : -1;
        if (k < 0) {
          draw([], 0, '');
          return;
        }
        const c = caps[k];
        draw(
          c.words.map((w) => w.w),
          litAt(c, t),
          `${seg}:${k}`
        );
      };
      paint();
      return useKick.subscribe(paint);
    }
    /* the plan says its own lines: cut short the same way, each word lit at her pace from the moment the line arrives */
    let raf = 0;
    let since = 0;
    let cur: string | null = null;
    let caps: Cap[] = [];
    let dur = 0;
    const tick = () => {
      const t = (performance.now() - since) / 1000;
      const k = Math.max(0, capIndexAt(caps, t));
      const c = caps[k];
      if (!c) {
        draw([], 0, '');
        return;
      }
      draw(
        c.words.map((w) => w.w),
        litAt(c, t),
        `${cur}:${k}`
      );
      if (t < dur + 0.3) raf = requestAnimationFrame(tick);
    };
    const on = (text: string | null) => {
      cur = text;
      const n = text ? text.split(/\s+/).filter(Boolean).length : 0;
      dur = n / 2.7;
      caps = text && n ? capsOfText(text, dur) : [];
      since = performance.now();
      cancelAnimationFrame(raf);
      tick();
    };
    on(useCaption.getState().text);
    const off = useCaption.subscribe((s) => {
      if (s.text !== cur) on(s.text);
    });
    return () => {
      off();
      cancelAnimationFrame(raf);
    };
  }, [film]);
  return <div ref={box} className="rm-cap" data-on={show ? '1' : '0'} aria-live="polite" />;
}

/* her face and name card: face left, name, Manager under it (in the film, her face alone). The circle behind the face
   follows her voice. Play and pause belong to the whole film, never to her face */
/* b22 (his notes: "we don't need the Spotify logo here" over her desk video, then "where is the Spotify logo on the top
   left, it should show when the kickoff slide is opened"): the company's mark sits top left on the slides only */
function FilmMark() {
  const project = useFlow((s) => s.project);
  if (!project) return null;
  return (
    <span className="rm-firm">
      <img src={project.logo} alt="" draggable={false} />
      {project.company}
    </span>
  );
}

function Face({ faceRef, mode }: { faceRef: React.RefObject<HTMLDivElement | null>; mode: Mode }) {
  const manager = useFlow((s) => s.project?.manager);
  const vr = useRef<HTMLSpanElement>(null);
  /* b20 (his note: "remove the manager and her name"): her face alone, everywhere */
  /* in the film she is the face her video closed into */
  const src = (mode === 'kickoff' ? kick.run().hello?.face : undefined) ?? manager?.face;
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
        el.style.transform = `scale(${(1 + s * 0.26).toFixed(3)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div ref={faceRef} className="rm-face b-who" data-place={mode}>
      <span className="rm-fc">
        <span ref={vr} className="rm-vr" />
        {src && <img src={src} alt={manager?.full ?? ''} draggable={false} />}
      </span>
    </div>
  );
}

function RoomInner({ pid }: { pid: ProjectId }) {
  const screen = useFlow((s) => s.screen);
  const mode = modeOf(screen);
  const goto = useFlow((s) => s.actions.goto);
  const phase = useKick((s) => s.phase);
  const seg = useKick((s) => s.seg);
  const playing = useKick((s) => s.playing);
  const notes = useKick((s) => s.notes);
  const check = useKick((s) => s.check);
  const writing = useKick((s) => s.writing);
  const ready = useKick((s) => s.ready);
  const cc = usePrefs((s) => s.cc);
  const [closing, setClosing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [filmOn, setFilmOn] = useState(isFilm(mode));
  /* a click or Space on the film: its new state flashes in the middle and goes, the slide stays readable */
  const [flash, setFlash] = useState<{ n: number; play: boolean } | null>(null);
  const toggle = () => {
    kickToggle();
    setFlash((f) => ({ n: (f?.n ?? 0) + 1, play: useKick.getState().playing }));
  };

  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLDivElement>(null);
  const grew = useRef(false);
  const skipEntry = useRef(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const leavingRef = useRef(leaving);
  leavingRef.current = leaving;
  const resumeOnStay = useRef(false);
  const [walk, setWalk] = useState(false);
  /* b33: the Join Now landing before her hello. 'walk' when her walk closed into it, 'opening' while the film grows out */
  const [join, setJoin] = useState<null | 'walk' | 'plain' | 'opening'>(null);
  const joinRef = useRef(join);
  joinRef.current = join;
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;

  /* before any passive effect, dev landings included: this project's timeline. Then grow out of the brief */
  useLayoutEffect(() => {
    rail.mounts = (rail.mounts ?? 0) + 1;
    kickSetup(pid);
    const r = takeRect();
    const el = root.current;
    if (!r || !el || prefersReduced(el)) return;
    const inset = `inset(${r.top}px ${innerWidth - (r.left + r.width)}px ${innerHeight - (r.top + r.height)}px ${r.left}px round ${r.radius}px)`;
    el.animate([{ clipPath: inset }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], { duration: SPRING_MS, easing: SPRING });
    grew.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* developer mode: any kickoff moment, clean from any state */
  useDevGo(
    (id) => id.startsWith('kickoff:'),
    (id) => {
      skipEntry.current = true;
      setLeaving(false);
      pouStop();
      if (id === 'kickoff:walk') {
        kickSetup(pid);
        setJoin(null);
        setWalk(pid === 'spotify');
        return;
      }
      if (id === 'kickoff:join') {
        kickSetup(pid);
        setWalk(false);
        setJoin('plain');
        return;
      }
      setWalk(false);
      setJoin(null);
      kickLand(id);
    }
  );
  useDevGo(
    (id) => id.startsWith('pou:'),
    (id) => {
      skipEntry.current = true;
      setLeaving(false);
      kickFinished();
      pouLand(pid, id);
    }
  );

  /* what each mode starts when you arrive in it on your own */
  const entered = useRef<Mode | null>(null);
  useEffect(() => {
    const prev = entered.current;
    entered.current = mode;
    if (prev === mode) return;
    if (isFilm(mode)) setFilmOn(true);
    if (skipEntry.current) {
      skipEntry.current = false;
      return;
    }
    if (mode === 'kickoff') {
      pouStop();
      if (prev === 'breakdown' || prev === 'objective') kickReplay();
      /* b16: Spotify opens on her walk, full window; her hello at the desk starts once it closes into the frame */
      else if (pid === 'spotify') setWalk(true);
      else setJoin('plain');
    } else if (mode === 'pou') {
      kickStop(true);
      if (prev === null || prev === 'kickoff') kickFinished();
      pouEnter(pid, 0, prev === 'kickoff' ? 1100 : 600);
    } else {
      /* the check-in hands over to the plan's own voice */
      if (prev === 'pou') pouStop(true);
      /* the plan speaks now: leave her voice and the caption to it */
      kickStop(true);
      if (prev === null || prev === 'kickoff') kickFinished();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  /* a landing asked for before this render settles is spent by now */
  useEffect(() => {
    skipEntry.current = false;
  });

  /* the film leaves the DOM once the plan has covered it */
  useEffect(() => {
    if (isFilm(mode)) return;
    const id = window.setTimeout(() => setFilmOn(false), SPRING_MS);
    return () => window.clearTimeout(id);
  }, [mode]);

  /* the morph between the film and the plan: the frame grows from the film to the page, her face by FLIP */
  const placed = useRef<Mode>(mode);
  useLayoutEffect(() => {
    const prev = placed.current;
    placed.current = mode;
    if (prev === mode) return;
    const el = root.current;
    const fr = frame.current;
    const f = face.current;
    if (!el || !fr || !f || prefersReduced(el)) return;
    const fc = f.querySelector<HTMLElement>('.rm-fc') ?? f;
    el.dataset.mode = prev;
    const a = fr.getBoundingClientRect();
    /* out of the check-in, her face grows out of the face in her last voice note */
    const fa = (prev === 'pou' ? pouFaceTake() : null) ?? fc.getBoundingClientRect();
    el.dataset.mode = mode;
    const b = fr.getBoundingClientRect();
    const fb = fc.getBoundingClientRect();
    const fo = f.getBoundingClientRect();
    if (isFilm(prev) !== isFilm(mode) && a.width && b.width) {
      if (!isFilm(mode)) {
        /* the black film grows to the page and turns into its paper on the way */
        const css = getComputedStyle(el);
        const from = css.getPropertyValue('--b-film').trim();
        const to = css.getPropertyValue('--b-ground').trim();
        const inset = `inset(${a.top - b.top}px ${b.right - a.right}px ${b.bottom - a.bottom}px ${a.left - b.left}px round 28px)`;
        fr.animate(
          [
            { clipPath: inset, backgroundColor: from },
            { clipPath: 'inset(0px 0px 0px 0px round 0px)', backgroundColor: to },
          ],
          { duration: SPRING_MS, easing: SPRING }
        );
      } else {
        rise(fr, { y: 12, blur: 6, scale: 0.98 });
      }
    }
    /* b12: out of the meeting her face flies into her first voice note, the one she starts recording at once */
    if (prev === 'kickoff' && mode === 'pou') {
      const to = el.querySelector<HTMLElement>('.pv-th .pv-face');
      if (to) flyFace(fa, to, SPRING_MS + 120, SPRING);
      return;
    }
    if (fa.width && fb.width) {
      const origin = `${fb.left - fo.left}px ${fb.top - fo.top}px`;
      f.animate(
        [
          { transform: `translate(${fa.left - fb.left}px, ${fa.top - fb.top}px) scale(${fa.width / fb.width})`, transformOrigin: origin },
          { transform: 'none', transformOrigin: origin },
        ],
        { duration: SPRING_MS, easing: SPRING }
      );
    }
  }, [mode]);

  /* keys: Space plays or pauses, Shift and the arrows seek 5 s. Plain arrows and A belong to developer mode */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey) return;
      if (leavingRef.current) {
        if (e.key === 'Escape') setLeaving(false);
        return;
      }
      const typing = isTextEntry(e.target);
      if (!isFilm(modeRef.current) || joinRef.current) return;
      if (e.shiftKey && !typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        kickNudge(e.key === 'ArrowLeft' ? -5 : 5);
        return;
      }
      if (e.code === 'Space' && (!typing || e.altKey) && !e.shiftKey) {
        e.preventDefault();
        if (e.repeat) return;
        sfx.click();
        toggleRef.current();
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  /* leaving the Room: her voice stops unless the stage has already begun its own */
  useEffect(
    () => () => {
      pouStop(true);
      kickStop(useFlow.getState().screen === 'stage');
    },
    []
  );

  const okay = () => {
    if (closing) return;
    sfx.click();
    const fr = frame.current;
    const v = fr?.querySelector<HTMLVideoElement>('.sf-video');
    const fc = face.current?.querySelector<HTMLElement>('.rm-fc');
    const h = kick.run().hello;
    if (!fr || !v || !fc || !h || !useKick.getState().ready || prefersReduced(fr)) {
      kickReady();
      return;
    }
    setClosing(true);
    const vb = v.getBoundingClientRect();
    const k = Math.max(vb.width / h.w, vb.height / h.h);
    const cx = (vb.width - h.w * k) / 2 + h.x * k;
    const cy = (vb.height - h.h * k) / 2 + h.y * k;
    const r = h.r * k;
    /* her corner face waits hidden and a little smaller while the video plays: measure the seat it will take */
    const f = face.current!;
    f.style.transition = 'none';
    f.style.transform = 'none';
    const t = fc.getBoundingClientRect();
    f.style.transform = '';
    void f.offsetWidth;
    f.style.transition = '';
    const s = t.width / 2 / r;
    const dx = t.left + t.width / 2 - (vb.left + cx);
    const dy = t.top + t.height / 2 - (vb.top + cy);
    const far = Math.hypot(Math.max(cx, vb.width - cx), Math.max(cy, vb.height - cy));
    const a = v.animate(
      [
        { clipPath: `circle(${far}px at ${cx}px ${cy}px)`, transform: 'none', transformOrigin: `${cx}px ${cy}px` },
        { clipPath: `circle(${r * 1.6}px at ${cx}px ${cy}px)`, offset: 0.35 },
        { clipPath: `circle(${r}px at ${cx}px ${cy}px)`, transform: `translate(${dx}px, ${dy}px) scale(${s})`, transformOrigin: `${cx}px ${cy}px` },
      ],
      { duration: 820, easing: SPRING, fill: 'forwards' }
    );
    a.onfinish = () => {
      root.current?.setAttribute('data-swap', '1');
      kickReady();
      setClosing(false);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          a.cancel();
          root.current?.removeAttribute('data-swap');
        })
      );
    };
  };
  useDevAction('kick-ready', 'Okay', okay, ready && !closing);

  /* the controls come up while the pointer is over the film and sit there; they go down when it leaves */
  const hot = (on: boolean) => {
    const fr = frame.current;
    if (fr && fr.dataset.hot !== (on ? '1' : '0')) fr.dataset.hot = on ? '1' : '0';
  };

  const back = () => {
    sfx.click();
    if (!isFilm(mode) || join) {
      goto('world');
      return;
    }
    resumeOnStay.current = useKick.getState().playing;
    kickPause();
    setLeaving(true);
  };

  const stay = () => {
    sfx.click();
    setLeaving(false);
    if (resumeOnStay.current) kickPlay();
  };

  const leave = () => {
    sfx.click();
    setLeaving(false);
    kickStop();
    goto('world');
  };

  /* Join Now: her hello starts on the click and the film opens out of her face on the card */
  const joinNow = (f: HTMLElement | null) => {
    sfx.click();
    kickBegin(0);
    const fr = frame.current;
    if (!f || !fr || prefersReduced(fr)) {
      setJoin(null);
      return;
    }
    void openFrom(f, fr, () => flushSync(() => setJoin('opening'))).then(() => setJoin(null));
  };

  /* a click on the film pauses or plays, as b36's does. Not on the bar or a key */
  const filmClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'kickoff' || phase !== 'play' || check !== null || writing || ready || closing) return;
    if ((e.target as HTMLElement).closest('button, input, .rm-ctl, .nt-cw')) return;
    sfx.click();
    toggle();
  };

  const asking = check !== null || writing || ready || closing;
  const showCap = cc && ((mode === 'kickoff' && phase === 'play' && !asking) || mode === 'breakdown');
  const onVideo = mode === 'kickoff' && !!kick.run().segments[seg]?.video;

  return (
    <div ref={root} className="rm b-light" data-mode={mode} data-notes={notes} data-video={onVideo ? '1' : undefined} data-join={(mode === 'kickoff' && join) || undefined}>
      <header className="rm-sh">
        <button type="button" className="rm-bk" aria-label="Back" onClick={back}>
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        {mode === 'pou' && <PouMeter />}
        {(mode === 'kickoff' || mode === 'pou') && <span className="rm-hud" data-hud-anchor="" aria-hidden />}
      </header>

      <div
        ref={frame}
        className={isFilm(mode) ? 'rm-fr zd' : 'rm-fr'}
        data-hot="0"
        onClick={filmClick}
        onPointerMove={() => isFilm(mode) && hot(true)}
        onPointerLeave={() => hot(false)}
      >
        <div className="rm-sa zd">{filmOn && <SystemFilm pid={pid} />}</div>
        {(mode === 'breakdown' || mode === 'objective') && <PlanView mode={mode} />}
        {mode === 'pou' && <PouView />}
        {mode === 'kickoff' && !onVideo && <FilmMark />}
        <Face faceRef={face} mode={mode} />
        {flash && mode === 'kickoff' && (
          <span key={flash.n} className="rm-flash" data-play={flash.play ? '1' : '0'} aria-hidden onAnimationEnd={() => setFlash(null)}>
            {flash.play ? <Play size={28} strokeWidth={2} fill="currentColor" /> : <Pause size={28} strokeWidth={2} fill="currentColor" />}
          </span>
        )}
        <Caption film={isFilm(mode)} show={showCap} />
        <div className="rm-dim" />
        {mode === 'kickoff' && <CheckIn />}
        {mode === 'kickoff' && <ReadyCard on={ready && !closing} onOkay={okay} />}
        {isFilm(mode) && <Player onSeek={kickSeek} canPlay={mode === 'kickoff' && !asking} />}
      </div>
      <NotesPanel pid={pid} on={(mode === 'kickoff' && notes === 'on') || mode === 'pou'} />
      {join && mode === 'kickoff' && <Join fromWalk={join === 'walk'} onJoin={joinNow} />}
      {walk && mode === 'kickoff' && (
        <Walk
          frame={frame}
          onBack={() => {
            setWalk(false);
            goto('world');
          }}
          into={() => root.current?.querySelector<HTMLElement>('.jn-face') ?? null}
          onClosing={() => flushSync(() => setJoin('walk'))}
          onDone={() => setWalk(false)}
        />
      )}

      {leaving && (
        <div
          className="zj-scrim"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) stay();
          }}
        >
          <div className="zj-dialog rm-exit" role="dialog" aria-modal="true">
            <h2>Leave the meeting?</h2>
            <div className="rm-exit-k">
              <button type="button" className="zj-sec" onClick={stay}>
                Stay
              </button>
              <button type="button" className="zj-key" onClick={leave}>
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Room() {
  const pid = useFlow((s) => s.project?.id ?? 'spotify');
  return <RoomInner key={pid} pid={pid} />;
}
