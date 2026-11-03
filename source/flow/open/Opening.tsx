/* World map, enter it, a card, a project brief, Start. Hands the sheet's rect to the Room on the way out.
   b36's opening: the full bleed map with the zero mark and you on top, and you arrive on the dark card beside the
   company's building, the camera already in. Back from the card is the map itself: a small dark pill on the building and
   a note low in the middle. The brief rises as a sheet over the dimmed map.
   Three steps, one way forward (click, or the Enter key) and one way back (Escape, or the close) at each.
   Every move starts from where things really are, so any move can cut off the one before it.
   b27 (his note, 3 Nov: "Use this for Amazon cards ... the world map should be scrollable ... it has to be really good"):
   every company with a project has its tag on the map, and its own card. The map moves by hand (pan.ts). */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

import { softClick } from '../audio';
import { clock } from '../clock';
import { devMark, useDevGo } from '../dev/store';
import { giveRect } from '../ds/handoff';
import { SCENARIOS } from '../engine/stage';
import { useFlow } from '../engine/store';
import { SPRING, SPRING_MS, isTextEntry, pop, prefersReduced, rise } from '../stage/parts/util';
import type { ProjectId } from '../types';
import BriefBody from './BriefBody';
import { USER_ROLE } from './briefData';
import { progressOf } from './cardData';
import { cardSpot, driftOf, layout, nearCam, type Layout } from './camera';
import { leaveWorldBehind } from './ghost';
import { moveTo, place as placeLook, play, pressDown, settle, tapDown } from './motion';
import { aimAt, createPanner, middleOf, restCam, type Panner } from './pan';
import { PLACES } from './places';
import FightArt from './FightArt';
import { FIGHTS } from './fight';
import './open.css';
import './fight.css';

type Step = 'world' | 'card' | 'brief';
const ORDER: Step[] = ['world', 'card', 'brief'];
const isStep = (id: string): id is Step => (ORDER as string[]).includes(id);

const WORLD_URL = 'static/world/world.webp';
const ZERO_MARK = 'static/world/zero-mark.webp';
const LEARNER = { name: 'Sanjay', face: 'static/faces/learner.jpg' };
const EXIT = 'cubic-bezier(.5,0,.75,0)';

/* the looks things rest in when they are away */
const TAG_FIRST = { transform: 'translateY(10px) scale(0.98)', opacity: '0', filter: 'blur(6px)' };
const TAG_AWAY = { transform: 'scale(0.2)', opacity: '0', filter: 'blur(0px)' };
const CARD_AWAY = { transform: 'translateX(40px) scale(0.98)', opacity: '0', filter: 'blur(6px)' };
const NOTE_AWAY = { transform: 'translateY(8px)', opacity: '0', filter: 'blur(6px)' };
const TOP_AWAY = { transform: 'translateY(-6px)', opacity: '0', filter: 'blur(6px)' };
const HERE = { transform: 'none', opacity: '1', filter: 'blur(0px)' };

/* b36: head items and tabs rise 14 px, 30 ms apart, at 220 ms; the first section's lines rise 18 px, 50 ms apart, at 280 ms */
const HEAD_RISE = { y: 14, at: 220, step: 30 };
const BODY_RISE = { y: 18, at: 280, step: 50 };

const air = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--z4-air')) || 1;

const TITLES: Partial<Record<ProjectId, string>> = {
  spotify: 'static/media/title-spotify.webp',
  /* "Claim Check", zero-titles/amazon-fact-checker b3, cut to its edges like Spotify's */
  amazon: 'static/media/title-amazon.webp',
};

/* every company with a project stands on the map */
const ON_MAP = (Object.keys(PLACES) as ProjectId[]).filter((id) => SCENARIOS[id]);

function PlayGlyph() {
  return (
    <svg viewBox="0 0 8 10" aria-hidden="true">
      <path d="M0 1.2v7.6a.8.8 0 0 0 1.22.68l6.1-3.8a.8.8 0 0 0 0-1.36L1.22.52A.8.8 0 0 0 0 1.2Z" fill="currentColor" />
    </svg>
  );
}

export default function Opening() {
  const project = useFlow((s) => s.project);
  const goto = useFlow((s) => s.actions.goto);
  const jump = useFlow((s) => s.actions.jump);
  const doneStages = useFlow((s) => s.doneStages);
  const openStage = useFlow((s) => (s.stage && s.stage.projectId === s.project?.id ? s.stage.stageId : null));
  const pid: ProjectId = project?.id ?? 'spotify';
  /* the project the camera and the card are about. Picking a tag sets it at once, before the store comes back round */
  const pidRef = useRef<ProjectId>(pid);
  pidRef.current = pid;
  const spotOf = () => PLACES[pidRef.current];

  const root = useRef<HTMLDivElement>(null);
  const cam = useRef<HTMLDivElement>(null);
  const enter = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const pins = useRef<Partial<Record<ProjectId, HTMLDivElement | null>>>({});
  const tags = useRef<Partial<Record<ProjectId, HTMLDivElement | null>>>({});
  const pan = useRef<Panner | null>(null);
  /* where you left the map, as the world point in the middle of the window and the scale, so a resize keeps it */
  const view = useRef<{ x: number; y: number; s: number } | null>(null);
  const zm = useRef<HTMLSpanElement>(null);
  const me = useRef<HTMLSpanElement>(null);
  const note = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  const cardKey = useRef<HTMLButtonElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const sheetKey = useRef<HTMLButtonElement>(null);
  const sheetX = useRef<HTMLButtonElement>(null);

  const [step, setStep] = useState<Step>('world');
  /* the card's title art, until it fails to load for this project */
  const [artGone, setArtGone] = useState<ProjectId | null>(null);
  const at = useRef<Step>('world');
  const L = useRef<Layout>(layout(window.innerWidth, window.innerHeight));
  const started = useRef(false);
  const tagSeen = useRef(false);
  const leaving = useRef(false);
  const waits = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => {
    waits.current.push(clock.setTimeout(fn, ms));
  };
  const clearWaits = () => {
    waits.current.forEach((id) => clock.clearTimeout(id));
    waits.current = [];
  };

  /* ---------- where things are ---------- */

  const placeCard = () => {
    const el = card.current;
    if (!el) return;
    const s = cardSpot(L.current, spotOf(), el.offsetWidth, el.offsetHeight, 40 * air(), 24);
    el.style.left = `${s.left}px`;
    el.style.top = `${s.top}px`;
  };

  const applyLayout = () => {
    const old = L.current;
    const l = layout(window.innerWidth, window.innerHeight);
    L.current = l;
    const c = cam.current;
    if (c) Object.assign(c.style, { left: `${l.ox}px`, top: `${l.oy}px`, width: `${l.W0}px`, height: `${l.H0}px` });
    ON_MAP.forEach((id) => {
      const p = pins.current[id];
      const at0 = PLACES[id].dot;
      if (!p) return;
      const d = driftOf(l, at0.x, at0.y);
      p.style.left = `${at0.x * l.W0}px`;
      p.style.top = `${at0.y * l.H0}px`;
      p.style.setProperty('--gx', `${d.dx}px`);
      p.style.setProperty('--gy', `${d.dy}px`);
    });
    /* the map keeps the place you were looking at; near a building the push is recomputed. No edge of the world shows. */
    const P = pan.current;
    if (P && view.current && at.current === 'world') {
      const now = P.get();
      const m = middleOf(old, now);
      view.current = { ...m, s: now.s };
    }
    if (!view.current) {
      const r = restCam(l, ON_MAP.map((id) => PLACES[id]));
      view.current = { ...middleOf(l, r), s: r.s };
    }
    if (P) P.set(at.current === 'world' ? worldCam() : nearCam(l, spotOf()));
    placeCard();
  };

  const worldCam = () => {
    const v = view.current ?? { x: 0.5, y: 0.5, s: 1 };
    return aimAt(L.current, v.x, v.y, v.s);
  };
  /* leaving the map for a card: remember where it was */
  const keepView = () => {
    const P = pan.current;
    if (!P || at.current !== 'world') return;
    const c = P.get();
    view.current = { ...middleOf(L.current, c), s: c.s };
  };

  /* ---------- the parts, each shown or put away ---------- */

  /* every tag on the map, the one you came for first and the others 70 ms behind it */
  const eachTag = (fn: (t: HTMLDivElement, i: number) => void) => {
    const order = [pidRef.current, ...ON_MAP.filter((id) => id !== pidRef.current)];
    order.forEach((id, i) => {
      const t = tags.current[id];
      if (t) fn(t, i);
    });
  };
  const tagShow = (instant: boolean, delay = 0) => {
    const first = !tagSeen.current;
    tagSeen.current = true;
    eachTag((t, i) => {
      if (t.style.visibility !== 'visible') placeLook(t, first ? TAG_FIRST : TAG_AWAY);
      t.style.visibility = 'visible';
      if (instant) return placeLook(t, HERE);
      moveTo(t, HERE, { duration: SPRING_MS, easing: SPRING, delay: delay + i * 70 });
    });
  };
  const tagHide = (instant: boolean) => {
    tagSeen.current = true;
    eachTag((t) => {
      const gone = () => (t.style.visibility = 'hidden');
      if (instant) {
        placeLook(t, TAG_AWAY);
        return gone();
      }
      moveTo(t, TAG_AWAY, { duration: 320, easing: EXIT }, gone);
    });
  };

  /* the note low in the middle belongs to the world at rest. b36 hides it at once when the camera moves. */
  const noteShow = (instant: boolean, delay = 0) => {
    const n = note.current;
    if (!n) return;
    if (n.style.visibility !== 'visible') placeLook(n, NOTE_AWAY);
    n.style.visibility = 'visible';
    if (instant) return placeLook(n, HERE);
    moveTo(n, HERE, { duration: SPRING_MS, easing: SPRING, delay });
  };
  const noteHide = (instant: boolean) => {
    const n = note.current;
    if (!n) return;
    const gone = () => (n.style.visibility = 'hidden');
    if (instant) {
      placeLook(n, NOTE_AWAY);
      return gone();
    }
    moveTo(n, NOTE_AWAY, { duration: 240, easing: EXIT }, gone);
  };

  const cardShow = (instant: boolean, delay = 0) => {
    const el = card.current;
    if (!el) return;
    placeCard();
    if (el.style.visibility !== 'visible') {
      placeLook(el, CARD_AWAY);
      delete el.dataset.on;
      void el.offsetWidth;
    }
    el.style.visibility = 'visible';
    el.dataset.on = '1';
    if (instant) return placeLook(el, HERE);
    moveTo(el, HERE, { duration: SPRING_MS, easing: SPRING, delay });
  };
  const cardHide = (instant: boolean) => {
    const el = card.current;
    if (!el) return;
    const gone = () => {
      el.style.visibility = 'hidden';
      delete el.dataset.on;
    };
    if (instant) {
      placeLook(el, CARD_AWAY);
      return gone();
    }
    moveTo(el, { transform: 'translateX(32px) scale(0.98)', opacity: '0', filter: 'blur(4px)' }, { duration: 260, easing: EXIT }, gone);
  };

  const scrimTo = (on: boolean, instant: boolean) => {
    const s = scrim.current;
    if (!s) return;
    if (on) s.style.visibility = 'visible';
    const gone = () => {
      if (!on) s.style.visibility = 'hidden';
    };
    if (instant) {
      placeLook(s, { opacity: on ? '1' : '0' });
      return gone();
    }
    moveTo(s, { opacity: on ? '1' : '0' }, { duration: on ? 450 : 260, easing: 'ease-out' }, gone);
  };

  const sheetShow = (instant: boolean, delay = 0) => {
    const el = sheet.current;
    if (!el) return;
    if (el.style.visibility !== 'visible') placeLook(el, { transform: `translateY(${Math.round(window.innerHeight * 0.62)}px) scale(0.96)` });
    el.style.visibility = 'visible';
    if (instant) return placeLook(el, { transform: 'none' });
    moveTo(el, { transform: 'none' }, { duration: SPRING_MS, easing: SPRING, delay });
    el.querySelectorAll('[data-rise="h"]').forEach((n, i) => rise(n, { y: HEAD_RISE.y, blur: 6, delay: delay + HEAD_RISE.at + i * HEAD_RISE.step }));
    el.querySelectorAll('[data-rise="b"]').forEach((n, i) => rise(n, { y: BODY_RISE.y, blur: 6, delay: delay + BODY_RISE.at + i * BODY_RISE.step }));
    pop(sheetX.current, 0.6, delay + 300);
  };
  const sheetHide = (instant: boolean) => {
    const el = sheet.current;
    if (!el) return;
    const gone = () => (el.style.visibility = 'hidden');
    const down = { transform: `translateY(${Math.round(window.innerHeight * 0.7)}px) scale(0.97)` };
    if (instant) {
      placeLook(el, down);
      return gone();
    }
    moveTo(el, down, { duration: 420, easing: 'cubic-bezier(.55,.06,.68,.19)' }, gone);
  };

  /* the push in to the building, b36's 1.3 s curve, from wherever the camera is now; and back out to where you left the map */
  const camTo = (near: boolean, instant: boolean) => {
    const P = pan.current;
    if (!P) return;
    const target = near ? nearCam(L.current, spotOf()) : worldCam();
    if (instant) return P.set(target);
    P.tween(target);
  };

  /* ---------- the steps ---------- */

  /* land on a step at once, from any state */
  const land = (s: Step) => {
    clearWaits();
    applyLayout();
    placeLook(enter.current, HERE);
    placeLook(zm.current, HERE);
    placeLook(me.current, HERE);
    camTo(s !== 'world', true);
    if (s === 'world') {
      tagShow(true);
      noteShow(true);
    } else {
      tagHide(true);
      noteHide(true);
    }
    if (s === 'card') cardShow(true);
    else cardHide(true);
    scrimTo(s === 'brief', true);
    if (s === 'brief') sheetShow(true);
    else sheetHide(true);
  };

  const go = (next: Step, how: 'play' | 'land') => {
    if (leaving.current) return;
    const prev = at.current;
    if (prev === 'world' && next !== 'world') keepView();
    pan.current?.enable(next === 'world');
    at.current = next;
    setStep(next);
    clearWaits();
    const reduced = !!cam.current && prefersReduced(cam.current);
    if (how === 'land' || reduced) land(next);
    else if (prev === 'world' && next === 'card') {
      settle(enter.current);
      placeLook(enter.current, HERE);
      tagHide(false);
      noteHide(false);
      camTo(true, false);
      cardShow(false, 880);
    } else if (prev === 'card' && next === 'world') {
      cardHide(false);
      camTo(false, false);
      tagShow(false, 980);
      noteShow(false, 1080);
    } else if (prev === 'card' && next === 'brief') {
      cardHide(false);
      scrimTo(true, false);
      sheetShow(false, 140);
      later(() => sheet.current?.focus({ preventScroll: true }), 160);
    } else if (prev === 'brief' && next === 'card') {
      sheetHide(false);
      scrimTo(false, false);
      cardShow(false, 120);
    } else land(next);
    devMark(next);
  };

  const back = () => {
    if (at.current === 'brief') go('card', 'play');
    else if (at.current === 'card') go('world', 'play');
  };

  /* Start on the brief: the Room grows out of this sheet */
  const toKickoff = () => {
    if (leaving.current || at.current !== 'brief') return;
    const el = sheet.current;
    if (!el) return;
    leaving.current = true;
    clearWaits();
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 28;
    giveRect(el, radius);
    leaveWorldBehind(img.current, scrim.current);
    goto('kickoff');
  };

  /* the card's key: the brief the first time; coming back, straight to where you are on the path, grown out of the card */
  const returning = doneStages.length > 0 || openStage !== null;
  const cardGo = () => {
    if (leaving.current || at.current !== 'card') return;
    if (!returning) {
      go('brief', 'play');
      return;
    }
    const el = card.current;
    if (!el) return;
    leaving.current = true;
    clearWaits();
    giveRect(el, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 28);
    leaveWorldBehind(img.current, scrim.current);
    goto('objective');
  };

  /* a tag on the map: that company's card. Another company's tag makes it the project first (the engine's own switch). */
  const pick = (id: ProjectId) => {
    if (leaving.current || at.current !== 'world') return;
    if (id !== pidRef.current) {
      pidRef.current = id;
      jump(`${id}:world`);
    }
    go('card', 'play');
  };

  const forward = (fromKeyboard: boolean) => {
    if (fromKeyboard) softClick();
    if (at.current === 'world') go('card', 'play');
    else if (at.current === 'card') {
      if (fromKeyboard) pressDown(cardKey.current);
      cardGo();
    } else {
      if (fromKeyboard) tapDown(sheetKey.current);
      toKickoff();
    }
  };

  /* ---------- the world arrives ---------- */

  /* you arrive on the card, the map behind it, near the building. Dev mode can still land on the bare map */
  const playEnter = (onto: 'world' | 'card' = 'card') => {
    at.current = onto;
    pan.current?.enable(onto === 'world');
    setStep(onto);
    devMark(onto);
    land(onto);
    tagHide(true);
    noteHide(true);
    cardHide(true);
    tagSeen.current = false;
    eachTag((t) => placeLook(t, TAG_FIRST));
    placeLook(enter.current, { opacity: '0' });
    placeLook(zm.current, TOP_AWAY);
    placeLook(me.current, TOP_AWAY);
    let begun = false;
    const begin = () => {
      if (begun || at.current !== onto || leaving.current) return;
      begun = true;
      /* in from 1.06 with a short blur that is gone before the edges come home, so no edge ever shows */
      play(
        enter.current,
        [
          { transform: 'scale(1.06)', filter: 'blur(6px)', opacity: 0 },
          { opacity: 1, offset: 0.3 },
          { filter: 'blur(0px)', offset: 0.8 },
          { transform: 'none', filter: 'blur(0px)', opacity: 1 },
        ],
        { duration: SPRING_MS, easing: SPRING }
      );
      moveTo(zm.current, HERE, { duration: SPRING_MS, easing: SPRING, delay: 260 });
      moveTo(me.current, HERE, { duration: SPRING_MS, easing: SPRING, delay: 300 });
      if (onto === 'card') {
        cardShow(false, 420);
        return;
      }
      tagShow(false, 500);
      noteShow(false, 640);
    };
    const im = img.current;
    if (im) im.decode().then(begin, begin);
    later(begin, 2500);
  };

  /* ---------- wiring ---------- */

  /* developer mode: land on world, card or brief from anywhere, and play the real move when it is the next one */
  useDevGo(isStep, (id) => {
    const next = id as Step;
    if (!started.current) {
      started.current = true;
      if (next === 'world') playEnter('world');
      else {
        at.current = next;
        pan.current?.enable(false);
        setStep(next);
        land(next);
        devMark(next);
      }
      return;
    }
    const d = Math.abs(ORDER.indexOf(next) - ORDER.indexOf(at.current));
    go(next, d === 1 ? 'play' : 'land');
  });

  useLayoutEffect(() => {
    const c = cam.current;
    const r = root.current;
    if (c && r) pan.current = createPanner(c, r, () => L.current, { reduced: () => prefersReduced(c) });
    applyLayout();
    return () => {
      pan.current?.dispose();
      pan.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      playEnter();
    }
    let raf = 0;
    const onResize = () => {
      clock.cancelRaf(raf);
      raf = clock.raf(() => applyLayout());
    };
    const onKey = (e: KeyboardEvent) => {
      /* typing in a chat or a field: Enter is that field's, never this screen's (his note, 3 Nov) */
      if (e.defaultPrevented || (e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)))) return;
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTextEntry(e.target)) return;
      if (e.key === 'Escape') {
        if (at.current === 'world') return;
        e.preventDefault();
        back();
        return;
      }
      if (e.key !== 'Enter' || e.repeat) return;
      const t = e.target as HTMLElement | null;
      /* a control you reached with the keyboard keeps its own Enter. One you clicked does not hold the key hostage. */
      const btn = t?.closest?.('button, a, [role="tab"]');
      if (btn && !btn.hasAttribute('data-zo-main') && btn.matches(':focus-visible')) return;
      e.preventDefault();
      forward(true);
    };
    const ro = new ResizeObserver(() => placeCard());
    if (card.current) ro.observe(card.current);
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      clock.cancelRaf(raf);
      clearWaits();
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p = project;
  if (!p) return null;
  /* b17 (his note: "put this as the title image in the Start card"): a game title replaces the poster where one exists */
  const title = TITLES[p.id] ?? null;
  const fight = title ? undefined : FIGHTS[p.id];
  const art = title ?? (fight || artGone === p.id ? null : `static/media/card-${p.id}.webp`);
  const prog = progressOf(p.stages, doneStages);

  return (
    <div ref={root} className="zo" data-step={step}>
      <div ref={cam} className="zo-cam">
        <div ref={enter} className="zo-enter">
          <div className="zo-drift">
            <img ref={img} className="zo-world" src={WORLD_URL} alt="" draggable={false} decoding="async" />
          </div>
        </div>
        {ON_MAP.map((id) => {
          const m = SCENARIOS[id].meta;
          return (
            <div key={id} ref={(n) => void (pins.current[id] = n)} className="zo-pin">
              {/* the tag keeps its size on screen however far in the map is */}
              <div className="zo-pinbody">
                <div ref={(n) => void (tags.current[id] = n)} className="zo-tagwrap" inert={step !== 'world'}>
                  <button
                    type="button"
                    className="zo-tag"
                    data-zo-main={id === p.id ? '' : undefined}
                    aria-label={`${m.company}, ${USER_ROLE[id]}, ${m.manager.full}`}
                    onPointerDown={() => softClick()}
                    onClick={() => pick(id)}
                  >
                    <span className="zo-lg32">
                      <img src={m.logo} alt="" draggable={false} />
                    </span>
                    <span className="zo-tag-t">
                      <span className="zo-tag-n">{m.company}</span>
                      <span className="zo-tag-l">{USER_ROLE[id]}</span>
                    </span>
                    <img className="zo-tag-face" src={m.manager.face} alt="" draggable={false} />
                  </button>
                  <span className="zo-stem" aria-hidden />
                  <span className="zo-dot" aria-hidden />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="zo-top">
        <span ref={zm} className="zo-zm">
          <img src={ZERO_MARK} alt="" draggable={false} />
          zero
        </span>
        <span className="zo-me-row">
          {/* the Level pill sits just left of you on the map, and stays there; on the brief it steps back with this row (hud.css) */}
          <span className="zo-anchor" data-hud-anchor="" aria-hidden />
          <span ref={me} className="zo-me">
            <img src={LEARNER.face} alt="" draggable={false} />
            {LEARNER.name}
          </span>
        </span>
      </div>

      <div ref={note} className="zo-note" aria-hidden={step !== 'world'}>
        {p.manager.name} at {p.company} has a project for you
      </div>

      <article
        ref={card}
        className="zo-card"
        data-title={title ? '1' : undefined}
        data-back={returning ? '1' : undefined}
        data-art={art || fight ? '1' : undefined}
        data-fight={fight ? '1' : undefined}
        aria-label={p.title}
        inert={step !== 'card'}
      >
        <div className="zo-card-h">
          {!title && (
          <span className="zo-copill">
            <span className="zo-lg28">
              <img src={p.logo} alt="" draggable={false} />
            </span>
            {p.company}
          </span>
          )}
          <button type="button" className="zo-round" aria-label="Back to the map" onClick={() => at.current === 'card' && back()}>
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        {fight && (
          <div className="zo-art2">
            <FightArt f={fight} me={LEARNER} />
          </div>
        )}
        {art && (
          <div className="zo-art2" data-title={title ? '1' : undefined}>
            <img src={art} alt="" draggable={false} onError={() => setArtGone(p.id)} />
          </div>
        )}
        <h2 className="zo-card-t">{p.title}</h2>
        {returning ? (
          <div className="zo-prog" aria-label={`Stage ${Math.min(prog.index + 1, prog.n)} of ${prog.n}`}>
            <span className="zo-prog-l">
              <span className="zo-prog-n">
                Stage {Math.min(prog.index + 1, prog.n)} of {prog.n}
              </span>
              {prog.current && <span className="zo-prog-t">{prog.current.title}</span>}
            </span>
            <span className="zo-segs" aria-hidden>
              {p.stages.map((s, i) => (
                <span key={s.id} className="zo-seg" data-tone={i < prog.index ? 'done' : i === prog.index ? 'now' : 'later'} />
              ))}
            </span>
          </div>
        ) : null}
        <button
          ref={cardKey}
          type="button"
          className="zo-k3"
          data-zo-main=""
          onPointerDown={() => softClick()}
          onClick={cardGo}
        >
          <PlayGlyph />
          <b>{returning ? 'Continue' : 'Enter'}</b>
        </button>
      </article>

      <div ref={scrim} className="zo-scrim" aria-hidden onClick={() => at.current === 'brief' && back()} />

      <div className="zo-sheetwrap">
        <section
          ref={sheet}
          className="zo-sheet zd"
          role="dialog"
          aria-modal="true"
          aria-label={p.title}
          tabIndex={-1}
          inert={step !== 'brief'}
        >
          <button ref={sheetX} type="button" className="zo-x" aria-label="Close the brief" onClick={() => at.current === 'brief' && back()}>
            <X strokeWidth={1.75} />
          </button>
          <header className="zo-hd">
            <span className="zo-art" data-rise="h">
              <img src={p.logo} alt={p.company} draggable={false} />
            </span>
            <h2 className="zo-hd-t" data-rise="h">
              {p.title}
            </h2>
            <button
              ref={sheetKey}
              type="button"
              className="zj-key zo-start"
              data-zo-main=""
              data-rise="h"
              onPointerDown={() => softClick()}
              onClick={toKickoff}
            >
              <span className="zo-pl">
                <PlayGlyph />
              </span>
              Start
            </button>
          </header>
          <BriefBody project={p} />
        </section>
      </div>
    </div>
  );
}
