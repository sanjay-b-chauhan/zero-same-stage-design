/* The film's engine, after b36 open/film.js: every reveal is keyed to the word she says (its Whisper time minus 0.12 s),
   and what is on screen is a pure function of the time, so a seek, a pause or a dev landing is right by construction.
   One reveal, In: it rises and sharpens from a blur when time moves forward normally, and simply is there after a jump.
   It leaves upward with a blur (b36 kkOut). Everything is laid out on a 1920 by 840 stage, the top 78 percent of the film. */
import { createContext, useContext, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Word } from './words';

export const W = 1920;
export const H = 840;
export const LEAD = 0.12;

/* b36 core.css curves, as WAAPI easings */
export const SOFT =
  'linear(0, .02 1.3%, .083 2.8%, .34 7.1%, .651 12.7%, .869 18.5%, .943 21.6%, .995 25.2%, 1.024 29%, 1.036 33.4%, 1.027 41.9%, 1.003 62%, 1)';
export const SPRINGY =
  'linear(0, .009, .035 2.1%, .141 4.4%, .723 12.9%, .938 16.7%, 1.017 18.8%, 1.077 21%, 1.121 23.4%, 1.149 26.1%, 1.163 29.5%, 1.159 33.1%, 1.051 49.8%, 1.012 58.6%, .994 69.7%, 1.001 95%, 1)';
export const EASE = 'cubic-bezier(.2,.8,.2,1)';

export const REDUCED = (() => {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
})();

/* ---------- cue times from her real words ---------- */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/* "name word|name word": each name takes the time of the next matching word after the last one found, like b36 resolve() */
export function resolve(words: Word[], spec: string): Record<string, number> {
  const out: Record<string, number> = { _0: 0 };
  let j = 0;
  let last = 0;
  for (const pair of spec.split('|')) {
    const [name, wd] = pair.trim().split(/\s+/);
    if (!name || !wd) continue;
    const want = norm(wd);
    let f = -1;
    for (let i = j; i < words.length; i++) {
      if (norm(words[i][1]) === want) {
        f = i;
        break;
      }
    }
    if (f < 0) {
      console.warn('film cue not found', name, wd);
      out[name] = last + 0.6;
    } else {
      out[name] = words[f][0];
      j = f + 1;
    }
    last = out[name];
  }
  return out;
}

export interface Cues {
  at: Record<string, number>;
  order: string[]; /* names sorted by time */
  rank: Record<string, number>;
  times: number[]; /* reveal times (minus the lead), sorted */
}

export function cuesOf(words: Word[], spec: string): Cues {
  const at = resolve(words, spec);
  const order = Object.keys(at).sort((a, b) => at[a] - at[b]);
  const rank: Record<string, number> = {};
  order.forEach((n, i) => (rank[n] = i));
  return { at, order, rank, times: order.map((n) => Math.max(0, at[n] - LEAD)) };
}

/* how many reveals have happened by time t */
export const stepAt = (c: Cues, t: number): number => {
  let n = 0;
  for (const x of c.times) if (x <= t + 1e-4) n++;
  return n;
};

/* ---------- the film context: what is on, and whether time is moving forward normally ---------- */
interface Ctx {
  on: (k: string) => boolean;
  live: boolean;
}
export const FilmCtx = createContext<Ctx>({ on: () => true, live: false });
export const useFilm = () => useContext(FilmCtx);

export const ctxOf = (c: Cues, step: number, live: boolean): Ctx => ({
  live,
  on: (k) => {
    const r = c.rank[k];
    if (r == null) {
      console.warn('film cue unknown', k);
      return false;
    }
    return r < step;
  },
});

/* ---------- motion ---------- */
type Enter = 'rise' | 'pop' | 'none' | 'settle' | 'left';
type Leave = 'up' | 'right' | 'none';

const ENTER: Record<Exclude<Enter, 'none'>, { k: Keyframe[]; ms: number; e: string }> = {
  /* b36 kkO: up from 1.1u, scale .965, blur 8 to sharp */
  rise: {
    k: [
      { transform: 'translateY(22px) scale(.965)', filter: 'blur(8px)', opacity: 0 },
      { opacity: 1, offset: 0.16 },
      { transform: 'none', filter: 'blur(0px)', opacity: 1 },
    ],
    ms: 660,
    e: SOFT,
  },
  /* b36 pop: scale from its own centre with a little spring, sharpening as it lands */
  pop: {
    k: [
      { transform: 'scale(.62)', filter: 'blur(6px)', opacity: 0 },
      { opacity: 1, offset: 0.14 },
      { transform: 'none', filter: 'blur(0px)', opacity: 1 },
    ],
    ms: 640,
    e: SPRINGY,
  },
  /* the opener, already mostly there on the first frame */
  settle: {
    k: [
      { transform: 'translateY(10px) scale(.985)', filter: 'blur(4px)', opacity: 0.6 },
      { transform: 'none', filter: 'blur(0px)', opacity: 1 },
    ],
    ms: 520,
    e: SOFT,
  },
  left: {
    k: [
      { transform: 'translateX(-40px)', filter: 'blur(6px)', opacity: 0 },
      { opacity: 1, offset: 0.16 },
      { transform: 'none', filter: 'blur(0px)', opacity: 1 },
    ],
    ms: 640,
    e: SOFT,
  },
};
const LEAVE: Record<Exclude<Leave, 'none'>, { k: Keyframe[]; ms: number }> = {
  /* b36 kkOut */
  up: { k: [{}, { transform: 'translateY(-34px) scale(.985)', filter: 'blur(12px)', opacity: 0 }], ms: 460 },
  /* walking out of the room */
  right: { k: [{}, { transform: 'translateX(150px)', filter: 'blur(10px)', opacity: 0 }], ms: 620 },
};

export function enter(el: Element, how: Enter, delay = 0) {
  if (how === 'none' || REDUCED) return;
  const m = ENTER[how];
  el.animate(m.k, { duration: m.ms, delay: delay * 1000, easing: m.e, fill: 'backwards' });
}

/* ---------- the one reveal ---------- */
export interface InProps {
  k: string; /* on from this cue */
  till?: string; /* gone from this cue */
  dim?: string; /* dims to .38 from this cue */
  wake?: string; /* dim until this cue */
  faint?: boolean; /* dim now, for ranges the scene works out itself */
  al?: 'l'; /* x is the left edge, not the centre */
  x?: number;
  y?: number; /* centre on the stage, when given */
  a?: Enter;
  out?: Leave;
  d?: number; /* stagger, seconds, only when playing */
  c?: string;
  s?: CSSProperties;
  children?: ReactNode;
}

type St = 'on' | 'out' | 'off';

export function In({ k, till, dim, wake, faint, al, x, y, a = 'rise', out = 'up', d = 0, c, s, children }: InProps) {
  const f = useFilm();
  const vis = f.on(k) && !(till ? f.on(till) : false);
  const [st, setSt] = useState<St>(vis ? 'on' : 'off');
  const play = useRef(vis && f.live);
  const el = useRef<HTMLDivElement>(null);
  if (vis && st !== 'on') {
    play.current = f.live;
    setSt('on');
  } else if (!vis && st === 'on') {
    setSt(f.live && out !== 'none' && !REDUCED ? 'out' : 'off');
  } else if (!vis && st === 'out' && !f.live) {
    setSt('off');
  }
  useLayoutEffect(() => {
    const e = el.current;
    if (!e) return;
    if (st === 'on') {
      e.getAnimations().forEach((x) => x.cancel());
      if (play.current) enter(e, a, d);
      play.current = false;
    } else if (st === 'out' && out !== 'none') {
      const m = LEAVE[out];
      const an = e.animate(m.k, { duration: m.ms, easing: EASE, fill: 'forwards' });
      an.onfinish = () => setSt((v) => (v === 'out' ? 'off' : v));
    }
  }, [st]); // eslint-disable-line react-hooks/exhaustive-deps
  if (st === 'off') return null;
  const dimmed = !!faint || (dim ? f.on(dim) : false) || (wake ? !f.on(wake) : false);
  const pos: CSSProperties = x != null || y != null ? { left: x, top: y } : {};
  return (
    <div ref={el} className={`kf-in${x != null || y != null ? ' kf-at' : ''}${al === 'l' ? ' kf-atl' : ''}${dimmed ? ' kf-dim' : ''}${c ? ' ' + c : ''}`} style={{ ...pos, ...s }}>
      {children}
    </div>
  );
}

/* a scene: a whole-stage layer that leaves with b36's kkOut; its parts arrive on their own */
export function Scene({ k, till, children }: { k: string; till?: string; children: ReactNode }) {
  return (
    <In k={k} till={till} a="none" c="kf-scene">
      {children}
    </In>
  );
}

/* is the thing on yet (for state that changes in place) */
export const useOn = (k: string) => useFilm().on(k);

/* ---------- line icons ---------- */
/* b36's glyphs: about 2.5 px on a 1124 px film, so 4.3 units on the 1920 stage at any size, round caps.
   Small icons get a little more so they stay legible */
export const STROKE = 4.3;
export const sw = (s: number) => Math.min(2.25, Math.max(0.4, (STROKE * 24) / s));

export function Ico({ I, s, c }: { I: LucideIcon; s: number; c?: string }) {
  /* inline, so a host's icon rule (zero-jobs.css sizes every svg.lucide under .zj to 16) cannot shrink it */
  const w = sw(s);
  return <I size={s} strokeWidth={w} style={{ width: s, height: s, strokeWidth: w, color: c }} absoluteStrokeWidth={false} />;
}

/* ---------- drawn lines: they draw on along their path when time moves forward ---------- */
type Pt = [number, number];

const curvePts = (a: Pt, b: Pt, bend: number, n = 28): Pt[] => {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const cx = mx - (b[1] - a[1]) * bend;
  const cy = my + (b[0] - a[0]) * bend;
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * cx + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * cy + t * t * b[1]]);
  }
  return out;
};

export interface DrawProps {
  k: string;
  till?: string;
  dim?: string;
  p: Pt[];
  bend?: number;
  w?: number;
  col?: string;
  dash?: string;
  head?: number;
  dur?: number;
  d?: number;
}

function Stroke({ p, bend, w = 5, col = 'var(--b-t3)', dash, head = 0, dur = 0.7, d = 0 }: Omit<DrawProps, 'k' | 'till' | 'dim'>) {
  const f = useFilm();
  const live = useRef(f.live).current;
  const id = useId().replace(/:/g, '');
  const pts = bend && p.length === 2 ? curvePts(p[0], p[1], bend) : p;
  const dd = pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ');
  const [x1, y1] = pts[pts.length - 2];
  const [x2, y2] = pts[pts.length - 1];
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / L;
  const uy = (y2 - y1) / L;
  const hd = head
    ? `M${x2 - ux * head - uy * head * 0.62} ${y2 - uy * head + ux * head * 0.62} L${x2} ${y2} L${x2 - ux * head + uy * head * 0.62} ${y2 - uy * head - ux * head * 0.62}`
    : '';
  const draw = useRef<SVGPathElement>(null);
  const tip = useRef<SVGPathElement>(null);
  useLayoutEffect(() => {
    if (!live || REDUCED) return;
    draw.current?.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: dur * 1000, delay: d * 1000, easing: 'cubic-bezier(.3,.6,.2,1)', fill: 'backwards' });
    tip.current?.animate([{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'none' }], {
      duration: 260,
      delay: (d + dur * 0.82) * 1000,
      easing: EASE,
      fill: 'backwards',
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const common = { fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg className="kf-svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      {dash ? (
        <>
          <defs>
            <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
              <path ref={draw} d={dd} {...common} stroke="#fff" strokeWidth={w + 6} pathLength={1} strokeDasharray="1 1" />
            </mask>
          </defs>
          <path d={dd} {...common} style={{ stroke: col }} strokeWidth={w} strokeDasharray={dash} mask={`url(#${id})`} />
        </>
      ) : (
        <path ref={draw} d={dd} {...common} style={{ stroke: col }} strokeWidth={w} pathLength={1} strokeDasharray="1 1" />
      )}
      {hd && <path ref={tip} d={hd} {...common} strokeWidth={w} style={{ stroke: col, transformBox: 'fill-box', transformOrigin: 'center' }} />}
    </svg>
  );
}

export function Draw({ k, till, dim, ...rest }: DrawProps) {
  return (
    <In k={k} till={till} dim={dim} a="none" c="kf-scene">
      <Stroke {...rest} />
    </In>
  );
}
