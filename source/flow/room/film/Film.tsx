/* The kickoff film. <Film project seg t /> draws the moment (chapter seg, t seconds into her take) by construction:
   what is on is decided by which of her words have been said, so a seek, a pause or a dev landing is right with no history.
   When t moves forward in small steps (she is speaking) things arrive and leave with motion; any jump simply lands.
   Fills its parent. Content stays in the top 78 percent, the Room keeps the rest for her caption, face and timeline. */
import { memo, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import type { ProjectId } from '../../types';
import { runOf } from '../run';
import { AMAZON_FILM } from './amazon';
import { EASE, FilmCtx, H, REDUCED, W, ctxOf, cuesOf, stepAt, type Cues } from './core';
import { SPOTIFY_FILM } from './spotify';
import { WORDS } from './words';
import './film.css';

export interface Chapter {
  spec: string; /* "cue word|cue word", in the order she says them */
  C: ComponentType;
}

const FILMS: Record<ProjectId, Chapter[]> = { spotify: SPOTIFY_FILM, amazon: AMAZON_FILM };
const DUR: Record<ProjectId, number[]> = {
  spotify: runOf('spotify').segments.map((s) => s.audio_duration_sec),
  amazon: runOf('amazon').segments.map((s) => s.audio_duration_sec),
};

const CUES = new Map<string, Cues>();
export function cuesFor(p: ProjectId, i: number): Cues {
  const key = `${p}:${i}`;
  let c = CUES.get(key);
  if (!c) {
    c = cuesOf(WORDS[p]?.[i] ?? [], FILMS[p][i].spec);
    CUES.set(key, c);
  }
  return c;
}

/* a chapter's drawing, re-rendered only when one of her words passes */
const Layer = memo(function Layer({ C, cues, step, live }: { C: ComponentType; cues: Cues; step: number; live: boolean }) {
  const v = useMemo(() => ctxOf(cues, step, live), [cues, step, live]);
  return (
    <FilmCtx.Provider value={v}>
      <C />
    </FilmCtx.Provider>
  );
});

interface Seen {
  key: string;
  p: ProjectId;
  i: number;
  t: number;
  step: number;
}

export default function Film({ project, seg, t }: { project: ProjectId; seg: number; t: number }) {
  const p: ProjectId = FILMS[project] ? project : 'spotify';
  const film = FILMS[p];
  const i = Math.max(0, Math.min(seg | 0, film.length - 1));
  const T = Number.isFinite(t) ? Math.max(0, t) : 0;
  const key = `${p}:${i}`;
  const cues = cuesFor(p, i);
  const step = stepAt(cues, T);

  /* is she speaking us forward, or did we just land here */
  const seen = useRef<Seen | null>(null);
  const pv = seen.current;
  let live = false;
  if (pv) {
    if (pv.key === key) live = T >= pv.t - 0.02 && T - pv.t < 0.75;
    else if (pv.p === p && i === pv.i + 1) live = T < 0.75 && pv.t > (DUR[p][pv.i] ?? 0) - 1.2;
  }

  /* the chapter she just finished leaves upward while the next one arrives */
  const [gone, setGone] = useState<Seen | null>(null);
  if (pv && pv.key !== key) {
    if (live && !REDUCED && gone?.key !== pv.key) setGone(pv);
    else if (!live && gone) setGone(null);
  }

  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const goneEl = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    seen.current = { key, p, i, t: T, step };
  });

  /* a jump lands at once: anything still moving finishes where it was going */
  useLayoutEffect(() => {
    if (live) return;
    try {
      root.current?.getAnimations({ subtree: true }).forEach((a) => {
        if (!goneEl.current || !(a.effect instanceof KeyframeEffect) || !goneEl.current.contains(a.effect.target as Node)) a.finish();
      });
    } catch {
      /* getAnimations is everywhere we run; a failure only costs the motion */
    }
  }, [live, key, step]);

  useLayoutEffect(() => {
    const el = goneEl.current;
    if (!gone || !el) return;
    const an = el.animate([{}, { transform: 'translateY(-34px) scale(.985)', filter: 'blur(12px)', opacity: 0 }], {
      duration: 460,
      easing: EASE,
      fill: 'forwards',
    });
    an.onfinish = () => setGone((g) => (g === gone ? null : g));
    return () => an.cancel();
  }, [gone]);

  /* the 1920 by 840 stage, fitted into the top 78 percent */
  useLayoutEffect(() => {
    const r = root.current;
    const st = stage.current;
    if (!r || !st) return;
    const fit = () => {
      const w = r.clientWidth;
      const h = r.clientHeight * 0.78;
      if (!w || !h) return;
      const k = Math.min(w / W, h / H);
      st.style.transform = `translate(${((w - W * k) / 2).toFixed(2)}px, ${((h - H * k) / 2).toFixed(2)}px) scale(${k.toFixed(5)})`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(r);
    return () => ro.disconnect();
  }, []);

  const goneFilm = gone ? FILMS[gone.p] : null;
  return (
    <div ref={root} className={'kf' + (live ? '' : ' kf-still')} data-chapter={key} data-step={step}>
      <div ref={stage} className="kf-stage">
        {gone && goneFilm && (
          <div key={gone.key} ref={goneEl} className="kf-layer">
            <Layer C={goneFilm[gone.i].C} cues={cuesFor(gone.p, gone.i)} step={gone.step} live={false} />
          </div>
        )}
        <div key={key} className="kf-layer">
          <Layer C={film[i].C} cues={cues} step={step} live={live} />
        </div>
      </div>
    </div>
  );
}
