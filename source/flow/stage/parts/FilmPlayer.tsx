/* The explainer. Plays only after a No. Pause, one speed toggle, drag back only, 95 percent counts.
   The voice carries the words: the frame shows the scene for the cue being spoken, no captions.
   The audio is one element in the parent, so switching big and small keeps the playhead. */
import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { clock } from '../../clock';
import { useFlow } from '../../engine/store';
import { FILMS, type FilmDef, type FilmScene } from '../../data/films';
import type { Surface } from '../../types';
import { mss } from './util';

const ICON = { size: 16, strokeWidth: 1.75 };
const SPEEDS = [1, 1.2, 2];
const COUNTS_AT = 0.95;

let shared: { id: string; audio: HTMLAudioElement; max: number; speed: number; left: boolean } | null = null;

const audioFor = (film: FilmDef) => {
  if (shared?.id === film.id) return shared;
  stopFilm();
  const audio = new Audio(film.src);
  audio.preload = 'auto';
  shared = { id: film.id, audio, max: 0, speed: 1, left: false };
  return shared;
};

export function stopFilm(): void {
  if (!shared) return;
  shared.audio.pause();
  shared.audio.src = '';
  shared = null;
}

/* You left the picture, so the voice waits and picks up when you come back. Past the point it counted, she finishes her sentence. */
export function pauseFilm(): void {
  if (!shared || shared.audio.paused) return;
  if (shared.audio.currentTime / FILMS[shared.id].dur >= COUNTS_AT) return;
  shared.audio.pause();
  shared.left = true;
}

const cueAt = (film: FilmDef, t: number): number => {
  let c = 0;
  for (let i = 0; i < film.cues.length; i++) if (t >= film.cues[i]) c = i;
  return c;
};

function Scene({ scene, cue }: { scene: FilmScene; cue: number }) {
  if (scene.kind === 'words') {
    return (
      <div className="zs2-fs zs2-fs-words">
        {scene.items.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
    );
  }
  if (scene.kind === 'steps') {
    const lit = cue - scene.a - 1;
    return (
      <ol className="zs2-fs zs2-fs-steps">
        {scene.items.map((w, i) => (
          <li key={w} data-state={i === lit ? 'now' : i < lit ? 'done' : 'next'}>
            <span className="z-num">{i + 1}</span>
            <span>{w}</span>
          </li>
        ))}
      </ol>
    );
  }
  if (scene.kind === 'route') {
    const [app, hub, ...to] = scene.items;
    const step = cue - scene.a;
    return (
      <div className="zs2-fs zs2-fs-route">
        <span className="zs2-fs-box" data-on>
          {app}
        </span>
        <span className="zs2-fs-line" />
        <span className="zs2-fs-box" data-on>
          {hub}
        </span>
        <span className="zs2-fs-line" data-off={step < 1 || undefined} />
        <span className="zs2-fs-fan" data-off={step < 1 || undefined}>
          {to.map((w) => (
            <span key={w} className="zs2-fs-box" data-on>
              {w}
            </span>
          ))}
        </span>
      </div>
    );
  }
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i + 1 < scene.items.length; i += 2) pairs.push([scene.items[i], scene.items[i + 1]]);
  return (
    <dl className="zs2-fs zs2-fs-trace">
      {pairs.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function FilmPlayer({ surface, filmId }: { surface: Surface; filmId: string }) {
  const film = FILMS[filmId];
  const filmDone = useFlow((s) => s.actions.filmDone);
  const listening = useFlow((s) => s.ui.listening);
  const [, redraw] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const counted = useRef(false);
  const dragging = useRef(false);
  const was = useRef(false);

  useEffect(() => {
    if (!film) return;
    const s = audioFor(film);
    if (s.audio.paused && !s.audio.ended && (s.audio.currentTime === 0 || s.left)) void s.audio.play().catch(() => {});
    s.left = false;
    const id = clock.setInterval(() => {
      s.max = Math.max(s.max, s.audio.currentTime);
      const total = film.dur;
      if (!counted.current && s.max / total >= COUNTS_AT) {
        counted.current = true;
        filmDone(film.id);
      }
      redraw((n) => n + 1);
    }, 100);
    return () => clock.clearInterval(id);
  }, [film, filmDone]);

  useEffect(() => {
    if (!shared) return;
    if (listening && !shared.audio.paused) {
      was.current = true;
      shared.audio.pause();
    } else if (!listening && was.current) {
      was.current = false;
      void shared.audio.play().catch(() => {});
    }
  }, [listening]);

  if (!film) return null;
  const s = audioFor(film);
  const t = s.audio.currentTime;
  const total = film.dur;
  const cue = cueAt(film, t);
  const scene = film.scenes.find((x) => cue >= x.a && cue <= x.b) ?? film.scenes[0];
  const playing = !s.audio.paused && !s.audio.ended;

  const toggle = () => {
    s.left = false;
    if (playing) s.audio.pause();
    else void s.audio.play().catch(() => {});
    redraw((n) => n + 1);
  };
  const cycle = () => {
    s.speed = SPEEDS[(SPEEDS.indexOf(s.speed) + 1) % SPEEDS.length];
    s.audio.playbackRate = s.speed;
    redraw((n) => n + 1);
  };
  /* drag goes back only. Ahead of the furthest point heard, it stops at that point. */
  const seekFrom = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r) return;
    const want = (Math.max(0, Math.min(1, (clientX - r.left) / r.width))) * total;
    s.audio.currentTime = Math.min(want, s.max);
    redraw((n) => n + 1);
  };

  return (
    <div className="zs2-film" data-surface={surface}>
      <div className="zs2-film-frame">
        <div key={`${scene.a}`} className="zs2-film-scene">
          <Scene scene={scene} cue={cue} />
        </div>
      </div>
      <div className="zs2-film-bar">
        <button type="button" className="zs2-ico" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>
          {playing ? <Pause {...ICON} /> : <Play {...ICON} />}
        </button>
        <div
          ref={track}
          className="zs2-film-track"
          role="slider"
          aria-label="Position"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={t}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            seekFrom(e.clientX);
          }}
          onPointerMove={(e) => {
            if (dragging.current) seekFrom(e.clientX);
          }}
          onPointerUp={() => {
            dragging.current = false;
          }}
        >
          <span className="zs2-film-reach" style={{ transform: `scaleX(${s.max / total})` }} />
          <span className="zs2-film-fill" style={{ transform: `scaleX(${t / total})` }} />
          <span className="zs2-film-knob" style={{ left: `${(t / total) * 100}%` }} />
        </div>
        <span className="zs2-film-time z-num">{mss(Math.max(0, total - t) * 1000)}</span>
        <button type="button" className="zs2-film-speed z-num" aria-label={`Speed ${s.speed}x`} onClick={cycle}>
          {s.speed}x
        </button>
      </div>
    </div>
  );
}
