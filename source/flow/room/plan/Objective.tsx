/* The objective, the real product's screen (ObjectiveView: the project on the left, every stage on the right, Start on
   the one you are on) in our light language. No outlines and no surfaces: a stage is its number, its title and its
   minutes; the stage you are on is the one filled surface and holds the key. Links and tools take a surface only under
   the pointer. Her face and name are the Room's, placed at the top of the left column under the goal line: this page
   measures her seat and hands it to the frame (--ob-fx, --ob-fy), so she glides into it from the breakdown, her
   company beside her name.
   Coming back from a stage is its own moment (returnSeq.ts): the stage you finished takes its tick, the marker travels
   down the path to the next one, that row grows into the card, and only then its key rises.
   The brief rises over it as b36's dark sheet.
   b11 (his notes): no logo over the title, just "Manager" under her name, no "What good looks like": Project brief and
   Kickoff video only. The title comes in word by word, sharp out of a blur, then each piece under it, one after the other. */
import { Check, Flag, Play, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

import { BREAKDOWN } from '../../../content/lines';

import { softClick, softLand } from '../../audio';
import { clock } from '../../clock';
import { devMark, useDevAction, useDevGo } from '../../dev/store';
import { useFlow } from '../../engine/store';
import BriefBody from '../../open/BriefBody';
import { BRIEFS } from '../../open/briefData';
import { moveTo, place as placeLook } from '../../open/motion';
import { playStartMorph } from '../../screens/StartMorph';
import { SPRING, SPRING_MS, glideHeight, isTextEntry, pop, prefersReduced, rise } from '../../stage/parts/util';
import type { ProjectMeta, StageMeta } from '../../types';
import { markShown, returnOf, travelEase } from './returnSeq';
import { blurWords, words } from './blurWords';
import { useCaption } from '../caption';
import { JobHookList } from '../../stage/parts/JobHook';
import { useBreakdown } from './useBreakdown';
import './objective.css';

/* was: the stage you just finished, still holding the marker before its tick */
type Tone = 'done' | 'now' | 'later' | 'was';
/* the way back: 0 as you left it, 1 its tick, 2 the marker travels, 3 the next row grows into the card, 4 its key */
type Phase = 0 | 1 | 2 | 3 | 4;

const GLIDE: KeyframeAnimationOptions = { duration: SPRING_MS, easing: SPRING };
const ICON = { size: 14, strokeWidth: 2 } as const;
const TICK_AT = 750;
const TRAVEL_AT = 1350;
const TRAVEL_MS = 820;
const KEY_AFTER = 460;
/* b19 (his note: "The manager should come in the center, then it goes to the left, and then you just have one thing that
   she says ... In transition, people don't react"): centre, left, one line at a time while the stages land, Got it, her
   turn line, then her words become the title and stage 1 takes its key */
/* b22 (his note: "we don't need this got it ... it should be direct. Here we go, and we just start with stage one"): no
   question and no Got it. When her words are done she goes straight into the turn line */
type Intro = 'centre' | 'talk' | 'turn' | 'done';
const CENTRE_MS = 1300;
const TURN_MS = 3200;
const turnLine = (s: StageMeta | undefined) =>
  s ? `Here we go. Stage one, ${s.title.charAt(0).toLowerCase()}${s.title.slice(1)}.` : '';

const SayWords = ({ text }: { text: string }) => (
  <>
    {text.split(/(\s+)/).map((w, i) =>
      /^\s+$/.test(w) ? (
        w
      ) : (
        <span key={i} className="ob-sw" style={{ '--i': i / 2 } as CSSProperties}>
          {w}
        </span>
      )
    )}
  </>
);

/* b18: she says the breakdown here once per project, the first time this page shows. After that it is the chat's history */
const heard = new Set<string>();

/* a stretch of the path: grey, with the ink that fills it from the top once you have been there */
const Line = ({ at, on }: { at: 'a' | 'b'; on: boolean }) => (
  <span className={`ob-ln ob-ln-${at}`} data-on={on ? '1' : '0'} aria-hidden>
    <i className="ob-ink" />
  </span>
);

export default function Objective({ project, morph = false }: { project: ProjectMeta; morph?: boolean }) {
  const goto = useFlow((s) => s.actions.goto);
  const startStage = useFlow((s) => s.actions.startStage);
  const doneStages = useFlow((s) => s.doneStages);
  const openStage = useFlow((s) => {
    const st = s.stage;
    return st && st.projectId === project.id && !s.doneStages.includes(st.stageId) ? st.stageId : null;
  });

  const stages = project.stages;
  const tools = BRIEFS[project.id].tools;
  const currentIndex = stages.findIndex((s) => !doneStages.includes(s.id));
  const current = currentIndex < 0 ? null : stages[currentIndex];
  const started = doneStages.length > 0 || openStage !== null;

  /* a stage finished since this page last showed it plays the way back once; with reduced motion it is simply there */
  const [ret] = useState(() => (prefersReduced(document.documentElement) ? null : returnOf(project, doneStages)));
  const [phase, setPhase] = useState<Phase>(ret ? 0 : 4);
  const back = ret && phase < 4 ? ret : null;
  const waiting = back !== null;

  /* b18 (his note: "I don't want that screen"): no breakdown screen. She says it here, in the chat on the left, while the
     stages she names light on the right. Start is there from the first beat; asking her something stops her words */
  const [talk] = useState(() => !heard.has(project.id) && !ret && !!BREAKDOWN[project.id]);
  const [intro, setIntro] = useState<Intro>(talk ? 'centre' : 'done');
  const intoDone = useRef(false);
  const live = intro !== 'done';
  const { state: said, halt, skip } = useBreakdown(project, intro === 'talk');
  const caption = useCaption((c) => c.text);
  const saying = intro === 'talk' && typeof said.on === 'number' ? said.on : null;
  const line = intro === 'turn' ? turnLine(current ?? undefined) : intro === 'talk' ? caption : null;

  const baseTone = (i: number): Tone => (live ? 'later' : doneStages.includes(stages[i].id) ? 'done' : i === currentIndex ? 'now' : 'later');
  const toneOf = (i: number): Tone => {
    if (back && i === back.f) return phase >= 1 ? 'done' : 'was';
    if (back && i === back.n) return phase >= 3 ? 'now' : 'later';
    return baseTone(i);
  };
  /* the line into row i is inked once the path has reached it; on the way back, only once the marker sets off */
  const reached = (i: number) => {
    if (live) return false;
    if (back && phase < 2 && i > back.f && i <= back.n) return false;
    return i < stages.length ? baseTone(i) !== 'later' : currentIndex < 0;
  };
  const endTone: Tone = live ? 'later' : reached(stages.length) && !(back && back.n === stages.length && phase < 3) ? 'now' : 'later';

  const obRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const seatRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const hookRef = useRef<HTMLDivElement>(null);
  /* b21: the roles waiting at the end land once the finish line has */
  const showHook = !live || said.on === 'all' || said.asking;
  useLayoutEffect(() => {
    if (!showHook) return;
    hookRef.current?.querySelectorAll<HTMLElement>('[data-jh]').forEach((n, i) => rise(n, { y: 12, blur: 8, delay: 260 + i * 70 }));
  }, [showHook]);
  const markRef = useRef<HTMLLIElement>(null);
  const goRef = useRef<HTMLButtonElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const sheetXRef = useRef<HTMLButtonElement>(null);
  const rowH = useRef(0);
  const starting = useRef(false);
  const sheetSeen = useRef(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [goodOpen, setGoodOpen] = useState(false);

  /* the page arrives once: the left column rises, then each stage lands down the path, the one you are on last. Out of
     the breakdown the plan hands each piece over instead (morph.ts) */
  useLayoutEffect(() => {
    if (morph) return;
    const left = leftRef.current;
    const words = left ? blurWords(left.querySelector('.ob-t'), 120) : 0;
    left?.querySelectorAll('[data-rise]:not(.ob-t)').forEach((n, i) => rise(n, { y: 14, blur: 10, delay: 160 + words + i * 90 }));
    const timers: number[] = [];
    listRef.current?.querySelectorAll<HTMLElement>('.ob-row').forEach((row, i) => {
      const d = 220 + i * 60;
      row.querySelectorAll('.ob-ln').forEach((ln) =>
        ln.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 380, delay: d, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' })
      );
      pop(row.querySelector('.ob-node'), 0.2, d);
      rise(row.querySelector('.ob-body'), { y: 10, blur: 6, scale: row.dataset.tone === 'now' ? 0.97 : 1, delay: d + 40 });
      if (row.dataset.tone === 'done') timers.push(clock.setTimeout(() => softLand(i + 2), d + 80));
    });
    return () => timers.forEach((id) => clock.clearTimeout(id));
  }, []);

  /* this page has now shown every finished stage; the way back starts once the page has landed */
  useEffect(() => {
    markShown(project, doneStages);
    if (!ret) return;
    const timers = [clock.setTimeout(() => setPhase(1), TICK_AT), clock.setTimeout(() => setPhase(2), TRAVEL_AT)];
    return () => timers.forEach((id) => clock.clearTimeout(id));
  }, []);

  /* each step of the way back, drawn the moment its row has changed */
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!ret || !list) return;
    const rows = list.querySelectorAll<HTMLElement>(':scope > .ob-row');
    const from = rows[ret.f];
    const to = rows[ret.n];
    if (!from || !to) return;

    if (phase === 1) {
      /* the stage you finished: its dot fills and the tick draws in it */
      const node = from.querySelector<HTMLElement>('.ob-node');
      pop(node, 0.82);
      const path = node?.querySelector<SVGPathElement>('path');
      if (path) {
        const len = path.getTotalLength();
        path.animate(
          [
            { strokeDasharray: `${len}`, strokeDashoffset: `${len}` },
            { strokeDasharray: `${len}`, strokeDashoffset: '0' },
          ],
          { duration: 420, delay: 90, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'backwards' }
        );
      }
      softLand(ret.f + 2);
      return;
    }

    if (phase === 2) {
      /* the marker leaves the finished dot, travels down the line and lands on the next one. The ink follows it */
      const mark = markRef.current;
      const a = from.querySelector<HTMLElement>('.ob-node');
      const b = to.querySelector<HTMLElement>('.ob-node');
      if (!mark || !a || !b) return;
      const box = list.getBoundingClientRect();
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const x = ra.left - box.left;
      const y0 = ra.top - box.top + ra.height / 2;
      const y1 = rb.top - box.top + rb.height / 2;
      const inks = Array.from(list.querySelectorAll<HTMLElement>('.ob-ln[data-on="1"] > .ob-ink'))
        .map((ink) => {
          const r = ink.parentElement!.getBoundingClientRect();
          return { ink, top: r.top - box.top, h: Math.max(1, r.height) };
        })
        .filter(({ top }) => top >= Math.min(y0, y1) - 1 && top <= Math.max(y0, y1));
      inks.forEach(({ ink }) => (ink.style.transform = 'scaleY(0)'));
      mark.style.left = `${x}px`;
      mark.style.top = '0px';
      mark.style.visibility = 'visible';
      const half = ra.height / 2;
      let raf = 0;
      let t0 = 0;
      const frame = (now: number) => {
        if (!t0) t0 = now;
        const t = Math.min(1, (now - t0) / TRAVEL_MS);
        const p = travelEase(t);
        /* out of the bottom of the old dot, small, then grown into the size of a dot as it lands */
        const y = y0 + half + (y1 - y0 - half) * p;
        const s = t < 0.16 ? 0.45 * (t / 0.16) : t > 0.74 ? 0.45 + 0.55 * travelEase((t - 0.74) / 0.26) : 0.45;
        mark.style.transform = `translateY(${(y - half).toFixed(2)}px) scale(${s.toFixed(3)})`;
        inks.forEach(({ ink, top, h }) => (ink.style.transform = `scaleY(${Math.min(1, Math.max(0, (y - top) / h)).toFixed(3)})`));
        if (t < 1) {
          raf = clock.raf(frame);
          return;
        }
        inks.forEach(({ ink }) => (ink.style.transform = ''));
        rowH.current = to.getBoundingClientRect().height;
        setPhase(3);
      };
      raf = clock.raf(frame);
      return () => clock.cancelRaf(raf);
    }

    if (phase === 3) {
      /* the marker becomes the next stage's dot, and that row grows into the card. Its key waits for the next beat */
      const mark = markRef.current;
      if (mark) mark.style.visibility = 'hidden';
      pop(to.querySelector('.ob-node'), 0.9);
      softLand(ret.n + 2);
      const card = to.querySelector<HTMLElement>('.ob-card');
      if (card) {
        glideHeight(to, rowH.current);
        const fill = getComputedStyle(card).backgroundColor;
        card.animate(
          [
            { transform: 'scale(0.96)', backgroundColor: 'transparent' },
            { transform: 'none', backgroundColor: fill },
          ],
          { duration: SPRING_MS, easing: SPRING }
        );
        rise(card.querySelector('.ob-meta'), { y: 6, blur: 4, delay: 140 });
      }
      const id = clock.setTimeout(() => setPhase(4), KEY_AFTER);
      return () => clock.clearTimeout(id);
    }

    if (phase === 4) rise(goRef.current, { y: 10, blur: 6, scale: 0.94 });
  }, [phase, ret]);

  /* her seat: where the Room puts her face on this page, read live so a wrap or a resize keeps her in it. Left in place
     on the way out, so she glides from here */
  useLayoutEffect(() => {
    const ob = obRef.current;
    const seat = seatRef.current;
    const fr = ob?.closest<HTMLElement>('.rm-fr');
    if (!ob || !seat || !fr) return;
    const place = () => {
      const a = ob.getBoundingClientRect();
      const b = seat.getBoundingClientRect();
      fr.style.setProperty('--ob-fx', `${Math.round(b.left - a.left)}px`);
      fr.style.setProperty('--ob-fy', `${Math.round(b.top - a.top)}px`);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(ob);
    if (leftRef.current) ro.observe(leftRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    devMark('objective');
    heard.add(project.id);
  }, []);

  /* where her face is: the Room reads this off the frame. Centre to arrive, then the left column as she talks */
  useLayoutEffect(() => {
    const fr = obRef.current?.closest<HTMLElement>('.rm-fr');
    if (!fr) return;
    if (intro === 'centre' || intro === 'talk' || intro === 'turn') fr.dataset.ob = intro === 'centre' ? 'centre' : 'talk';
    else delete fr.dataset.ob;
    return () => {
      delete fr.dataset.ob;
    };
  }, [intro]);

  useEffect(() => {
    if (intro === 'centre') {
      const id = clock.setTimeout(() => setIntro('talk'), CENTRE_MS);
      return () => clock.clearTimeout(id);
    }
    if (intro === 'turn') {
      const id = clock.setTimeout(() => setIntro('done'), TURN_MS);
      return () => clock.clearTimeout(id);
    }
  }, [intro]);

  useEffect(() => {
    if (!said.asking || intro !== 'talk') return;
    halt();
    setIntro('turn');
  }, [said.asking, intro, halt]);

  /* a stage lands on her word, in the place it keeps */
  const landedSeen = useRef(0);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!live || !list) return;
    const rows = list.querySelectorAll<HTMLElement>(':scope > .ob-row');
    for (let i = landedSeen.current; i < said.landed; i++) {
      const row = rows[i];
      if (!row) continue;
      pop(row.querySelector('.ob-node'), 0.2);
      rise(row.querySelector('.ob-body'), { y: 10, blur: 6, delay: 40 });
    }
    landedSeen.current = Math.max(landedSeen.current, said.landed);
  }, [said.landed, live]);

  /* her words become the title: the mark and the title come in over her seat, stage 1 fills into the card, then its key */
  useLayoutEffect(() => {
    if (intro !== 'done' || !talk || intoDone.current) return;
    intoDone.current = true;
    const left = leftRef.current;
    const w = left ? blurWords(left.querySelector('.ob-t'), 120) : 0;
    rise(left?.querySelector('.ob-logo') ?? null, { y: 10, blur: 6, scale: 0.9 });
    const row = listRef.current?.querySelector<HTMLElement>('.ob-row[data-tone="now"]');
    const card = row?.querySelector<HTMLElement>('.ob-card');
    if (card) {
      const fill = getComputedStyle(card).backgroundColor;
      card.animate(
        [
          { transform: 'scale(0.96)', backgroundColor: 'transparent' },
          { transform: 'none', backgroundColor: fill },
        ],
        { duration: SPRING_MS, easing: SPRING, delay: 200, fill: 'backwards' }
      );
      rise(card.querySelector('.ob-meta'), { y: 6, blur: 4, delay: 340 });
      softLand(2);
    }
    rise(goRef.current, { y: 10, blur: 6, scale: 0.94, delay: 360 + w });
  }, [intro, talk]);



  useDevGo(
    (id) => id === 'objective',
    () => {
      setBriefOpen(false);
      setGoodOpen(false);
    }
  );

  const start = useCallback(async () => {
    const key = goRef.current;
    if (starting.current || waiting || live || !key || !current) return;
    starting.current = true;
    softClick();
    halt();
    try {
      await playStartMorph(key.closest<HTMLElement>('.ob-card') ?? key, obRef.current?.closest<HTMLElement>('.rm'));
      startStage(current.id);
    } finally {
      starting.current = false;
    }
  }, [current, startStage, waiting, live, halt]);

  useDevAction('ob-start', started ? 'Continue' : 'Start', () => void start(), !!current && !waiting);

  /* b23: one Next for this page, on the arrow and on a click on her side. Her arrival, each of her lines and the turn
     into the title all skip on the spot; once she is done, Next is Start */
  const nextBeat = useCallback(() => {
    if (intro === 'centre') return setIntro('talk');
    if (intro === 'talk') return skip();
    if (intro === 'turn') return setIntro('done');
    void start();
  }, [intro, skip, start]);
  const nextRef = useRef(nextBeat);
  nextRef.current = nextBeat;
  useDevAction('next', 'Next', () => nextRef.current(), !waiting);

  /* the brief rises over the page as b36's sheet, and drops away the same way */
  useLayoutEffect(() => {
    const el = sheetRef.current;
    const sc = scrimRef.current;
    if (!el || !sc) return;
    const h = window.innerHeight;
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

  /* Enter starts the stage you are on, once its key is there. Escape closes whatever is open. Tab still walks the page */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* typing in a chat or a field: Enter is that field's, never this screen's (his note, 3 Nov) */
      if (e.defaultPrevented || (e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)))) return;
      if (e.key === 'Escape' && (briefOpen || goodOpen)) {
        e.preventDefault();
        setBriefOpen(false);
        setGoodOpen(false);
        return;
      }
      if (e.defaultPrevented || isTextEntry(e.target)) return;
      const at = document.activeElement;
      if (e.key !== 'Enter' || e.repeat || briefOpen || goodOpen || at instanceof HTMLButtonElement || at instanceof HTMLAnchorElement) return;
      void start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [briefOpen, goodOpen, start]);

  return (
    <div ref={obRef} className="ob b-light" data-intro={live ? intro : undefined}>
      <div className="ob-grid" inert={briefOpen || goodOpen}>
        <div ref={leftRef} className="ob-left" onClick={live ? nextBeat : undefined}>
          {!live && (
            <>
              <img className="ob-logo" src={project.logo} alt={project.company} draggable={false} data-rise />
              <h1 className="ob-t" data-rise data-m="title">
                {words(project.title)}
              </h1>
            </>
          )}
          <div ref={seatRef} className="ob-seat" aria-hidden />
          {live && (
            <div className="ob-say">
              {line && (
                <p key={line} className="ob-line" aria-live="polite">
                  <SayWords text={line} />
                </p>
              )}
            </div>
          )}
        </div>

        <div className="ob-right">
        <ol ref={listRef} className="ob-list" aria-label="Stages">
          {stages.map((s, i) => {
            const tone = toneOf(i);
            return (
              <li key={s.id} className="ob-row" data-tone={tone} data-k={s.id} data-said={saying === i ? '1' : undefined} data-in={!live || i < said.landed ? '1' : '0'}>
                {i > 0 && <Line at="a" on={reached(i)} />}
                <Line at="b" on={reached(i + 1)} />
                <span className="ob-node" data-tone={tone} data-m={`n:${s.id}`}>
                  {tone === 'done' ? <Check size={13} strokeWidth={2.25} /> : i + 1}
                </span>
                {tone === 'now' ? (
                  <div className="ob-body ob-card" data-m={`c:${s.id}`}>
                    <span className="ob-ct">
                      <span className="ob-name" data-m={`t:${s.id}`}>
                        {s.title}
                      </span>
                    </span>
                    <button
                      ref={goRef}
                      type="button"
                      className="zk3 ob-go"
                      data-m="go"
                      data-wait={waiting ? '1' : undefined}
                      tabIndex={waiting ? -1 : undefined}
                      onClick={() => void start()}
                    >
                      {started ? 'Continue' : 'Start'}
                    </button>
                  </div>
                ) : (
                  <div className="ob-body" data-m={`c:${s.id}`}>
                    <span className="ob-name" data-m={`t:${s.id}`}>
                      {s.title}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
          <li className="ob-row" data-tone="end" data-on={endTone === 'now' ? '1' : undefined} data-k="end" data-in={!live || said.on === 'all' || said.asking ? '1' : '0'}>
            <Line at="a" on={reached(stages.length)} />
            <span className="ob-node" data-tone={endTone} data-m="n:end">
              <Flag size={12} strokeWidth={2} />
            </span>
            <div className="ob-body" data-m="c:end">
              <span className="ob-name" data-m="t:end">
                {project.end}
              </span>
            </div>
          </li>
          <li ref={markRef} className="ob-mark" aria-hidden />
        </ol>
        {showHook && (
          <div ref={hookRef} className="ob-hook">
            <JobHookList />
          </div>
        )}
        </div>
      </div>

      <div ref={scrimRef} className="ob-scrim" aria-hidden onClick={() => setBriefOpen(false)} />
      <div className="zo-sheetwrap ob-sheetwrap">
        <section ref={sheetRef} className="zo-sheet zd" role="dialog" aria-modal="true" aria-label="Project brief" tabIndex={-1} inert={!briefOpen}>
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

    </div>
  );
}
