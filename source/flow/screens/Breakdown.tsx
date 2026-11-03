/* After the POU she breaks the project down. Her face in the middle, a plain circle behind it on her real voice,
   one straight line, and each stop lands the moment her take for it starts. Nothing shows before she names it. */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { playTake, stopVoice, ting } from '../audio';
import { clock } from '../clock';
import { useFlow } from '../engine/store';
import type { ProjectMeta } from '../types';
import { breakdownScript, type BeatLine } from './breakdownScript';
import { fallbackProject } from './objectiveSeed';
import './Breakdown.css';

const ARRIVE_MS = 620;
const LINE_GAP_MS = 140;
const END_CUE = 'one clear';
const VOICE_REACH = 0.72;
const LEAVE_MS = 620;
const PLAY_GRACE_MS = 1200;
const TAKE_SLACK_MS = 2500;

const wordsMs = (text: string) => Math.max(900, text.trim().split(/\s+/).length * 340);

/* where in the line a phrase is said, as a share of the line */
const shareOf = (text: string, phrase: string) => {
  const at = text.toLowerCase().indexOf(phrase);
  return at < 0 ? null : at / text.length;
};

export default function Breakdown() {
  const project: ProjectMeta = useFlow((s) => s.project) ?? fallbackProject();
  const goto = useFlow((s) => s.actions.goto);

  const [titleIn, setTitleIn] = useState(false);
  const [landed, setLanded] = useState(0);
  const [now, setNow] = useState(-1);
  const [endIn, setEndIn] = useState(false);
  const [asking, setAsking] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const voiceRef = useRef<HTMLSpanElement>(null);
  const levelRef = useRef(0);
  const runRef = useRef(0);

  /* the circle eases toward her real level, quick up and slower down, so it reads as breath and never flickers */
  useEffect(() => {
    let raf = 0;
    let cur = 0;
    const tick = () => {
      const target = levelRef.current;
      cur += (target - cur) * (target > cur ? 0.42 : 0.16);
      if (voiceRef.current) voiceRef.current.style.transform = `scale(${(1 + cur * VOICE_REACH).toFixed(4)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const speak = useCallback((line: BeatLine, run: number, onStart: () => void, onProgress?: (share: number) => void) => {
    return new Promise<void>((resolve) => {
      let started = false;
      const start = () => {
        if (started) return;
        started = true;
        onStart();
      };
      /* no take, or the browser said no: same beat on a word count timer, the circle stays still */
      const silent = () => {
        start();
        const ms = wordsMs(line.text);
        const t0 = performance.now();
        const step = () => {
          if (run !== runRef.current) return resolve();
          const share = (performance.now() - t0) / ms;
          onProgress?.(share);
          if (share >= 1) return resolve();
          clock.setTimeout(step, 80);
        };
        step();
      };
      if (!line.url) return silent();
      /* a take that will not start or will not end can never hold the path back */
      const grace = clock.setTimeout(start, PLAY_GRACE_MS);
      const budget = clock.setTimeout(stopVoice, (line.dur ? line.dur * 1000 : wordsMs(line.text)) + TAKE_SLACK_MS);
      /* the first tick is the moment play() has really begun, so the stop lands on her first word */
      void playTake(line.url, {
        onLevel: (v) => {
          levelRef.current = v;
        },
        onTime: (t) => {
          start();
          if (line.dur) onProgress?.(t / line.dur);
        },
      }).then(() => {
        clock.clearTimeout(grace);
        clock.clearTimeout(budget);
        levelRef.current = 0;
        if (run !== runRef.current) return resolve();
        if (!started) return silent();
        onProgress?.(1);
        resolve();
      });
    });
  }, []);

  const play = useCallback(async () => {
    const run = ++runRef.current;
    const alive = () => run === runRef.current;
    setTitleIn(false);
    setLanded(0);
    setNow(-1);
    setEndIn(false);
    setAsking(false);
    setClearing(false);

    await clock.wait(ARRIVE_MS);
    const lines = breakdownScript(project.id);
    for (let i = 0; i < lines.length; i++) {
      if (!alive()) return;
      const line = lines[i];
      const endAt = shareOf(line.text, END_CUE);
      await speak(
        line,
        run,
        () => {
          if (!alive()) return;
          if (i === 0) setTitleIn(true);
          if (line.stop !== undefined) {
            setLanded(line.stop + 1);
            setNow(line.stop);
            ting();
          } else {
            setNow(-1);
          }
        },
        (share) => {
          if (alive() && endAt !== null && share >= endAt) setEndIn(true);
        }
      );
      if (!alive()) return;
      if (endAt !== null) setEndIn(true);
      await clock.wait(LINE_GAP_MS);
    }
    if (!alive()) return;
    setNow(-1);
    setEndIn(true);
    setAsking(true);
  }, [project.id, speak]);

  useEffect(() => {
    void play();
    return () => {
      runRef.current++;
      stopVoice();
    };
  }, [play]);

  const again = () => {
    if (leaving) return;
    setAsking(false);
    setClearing(true);
    runRef.current++;
    stopVoice();
    clock.setTimeout(() => void play(), 240);
  };

  const gotIt = () => {
    if (leaving) return;
    setLeaving(true);
    runRef.current++;
    stopVoice();
    clock.setTimeout(() => goto('objective'), LEAVE_MS);
  };

  /* Enter answers Got it, with no focus ring sitting on the key at rest. Tab still walks the two keys. */
  useEffect(() => {
    if (!asking || leaving) return;
    const onKey = (e: KeyboardEvent) => {
      /* typing in a chat or a field: Enter is that field's, never this screen's (his note, 3 Nov) */
      if (e.defaultPrevented || (e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)))) return;
      if (e.key !== 'Enter' || e.repeat || document.activeElement instanceof HTMLButtonElement) return;
      gotIt();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [asking, leaving]);

  const stops = project.stages;
  return (
    <div className="bd">
      <div className={`bd-stack${leaving ? ' bd-leave' : ''}`}>
        <div className="bd-face">
          <span ref={voiceRef} className="bd-voice" />
          <img className="bd-img" src={project.manager.face} alt={project.manager.full} draggable={false} />
        </div>
        <div className={`bd-title${titleIn ? ' is-in' : ''}`}>{project.title}</div>
        <div
          className={`bd-path${clearing ? ' is-clearing' : ''}`}
          style={{ '--bd-n': stops.length } as CSSProperties}
        >
          {stops.map((s, i) => {
            const isIn = i < landed;
            const cls = `bd-stop${isIn ? ' is-in' : ''}${i === now ? ' is-now' : ''}`;
            const nextIn = i + 1 < stops.length ? i + 1 < landed : endIn;
            return (
              <div key={s.id} className={cls}>
                <span className={`bd-seg${nextIn ? ' is-in' : ''}`} />
                <span className="bd-dot">
                  <svg className="bd-ring" viewBox="0 0 28 28" aria-hidden>
                    <circle cx="14" cy="14" r="13.5" />
                  </svg>
                  <span className="bd-n">{i + 1}</span>
                </span>
                <div className="bd-label">
                  <span className="bd-name">{s.short}</span>
                  <span className="bd-min"><span className="z-num">{s.minutes}</span> min</span>
                </div>
              </div>
            );
          })}
          <div className={`bd-end${endIn ? ' is-in' : ''}`}>{project.end}</div>
        </div>
      </div>
      <div className={`bd-keys${asking ? ' is-in' : ''}${leaving ? ' is-leaving' : ''}`}>
        <button type="button" className="bd-key plain" onClick={again} tabIndex={asking ? 0 : -1}>
          Again
        </button>
        <button type="button" className="bd-key main" onClick={gotIt} tabIndex={asking ? 0 : -1}>
          Got it
        </button>
      </div>
    </div>
  );
}
