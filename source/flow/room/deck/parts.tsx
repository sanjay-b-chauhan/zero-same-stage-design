/* The small parts of the deck: the reveal wrapper, the panel swap, the emphasis text and the one dial. */
import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { prefersReduced, SPRING, SPRING_MS } from '../../stage/parts/util';

export const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(' ');

export interface DeckCtxValue {
  has: (id: string) => boolean;
  jump: boolean;
}
export const DeckCtx = createContext<DeckCtxValue>({ has: () => false, jump: true });
export const useDeck = () => useContext(DeckCtx);

/* hidden items keep their layout space, so nothing jumps when they land */
export function R({
  id,
  as: Tag = 'div',
  className,
  st,
  style,
  children,
}: {
  id: string;
  as?: 'div' | 'span' | 'p';
  className?: string;
  st?: number;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const { has } = useDeck();
  return (
    <Tag data-r={id} data-st={st} className={cx('dk-r', has(id) && 'on', className)} style={style}>
      {children}
    </Tag>
  );
}

export const hasEm = (text: string) => text.includes('*');

export function Em({ text }: { text: string }) {
  return (
    <>
      {text.split('*').map((p, i) => (i % 2 ? <em key={i}>{p}</em> : p))}
    </>
  );
}

interface Motion {
  enterY: number;
  enterBlur: number;
  enterDelay: number;
  exitY: number;
  exitBlur: number;
  exitMs: number;
}
const SCENE_MOTION: Motion = { enterY: 10, enterBlur: 6, enterDelay: 70, exitY: -8, exitBlur: 4, exitMs: 260 };
const WORDS_MOTION: Motion = { enterY: 8, enterBlur: 6, enterDelay: 50, exitY: -8, exitBlur: 3, exitMs: 220 };

const enter = (el: HTMLElement | null, m: Motion) => {
  if (!el) return;
  el.getAnimations().forEach((a) => a.cancel());
  if (prefersReduced(el)) return;
  el.animate(
    [
      { transform: `translateY(${m.enterY}px)`, filter: `blur(${m.enterBlur}px)`, opacity: 0 },
      { transform: 'translateY(0)', filter: 'blur(0px)', opacity: 1 },
    ],
    { duration: SPRING_MS, delay: m.enterDelay, easing: SPRING, fill: 'backwards' }
  );
};

/* starts from wherever it is right now, so a swap can be interrupted at any moment */
const exit = (el: HTMLElement | null, m: Motion, done: () => void) => {
  if (!el || prefersReduced(el)) {
    done();
    return;
  }
  const cs = getComputedStyle(el);
  const from = { transform: cs.transform === 'none' ? 'translateY(0)' : cs.transform, filter: cs.filter === 'none' ? 'blur(0px)' : cs.filter, opacity: cs.opacity };
  el.getAnimations().forEach((a) => a.cancel());
  const a = el.animate([from, { transform: `translateY(${m.exitY}px)`, filter: `blur(${m.exitBlur}px)`, opacity: 0 }], {
    duration: m.exitMs,
    easing: 'cubic-bezier(.2,0,0,1)',
    fill: 'forwards',
  });
  a.onfinish = done;
};

/* One layer in, at most one layer out. A new key while one is leaving drops the older one: seeking can never pile up. */
export function Swap({ k, kind, layerClass, children }: { k: string; kind: 'scene' | 'words'; layerClass: string; children: ReactNode }) {
  const [state, setState] = useState<{ k: string; out: { k: string; node: ReactNode } | null }>({ k, out: null });
  const last = useRef<ReactNode>(children);
  const inRef = useRef<HTMLDivElement>(null);
  const outRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const motion = kind === 'scene' ? SCENE_MOTION : WORDS_MOTION;

  let cur = state;
  if (k !== state.k) {
    cur = { k, out: { k: state.k, node: last.current } };
    setState(cur);
  }

  useLayoutEffect(() => {
    last.current = children;
  });

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      if (kind === 'scene') enter(inRef.current, motion);
      return;
    }
    enter(inRef.current, motion);
    const leaving = cur.out?.k;
    exit(outRef.current, motion, () => setState((s) => (s.out?.k === leaving ? { ...s, out: null } : s)));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [cur.k]);

  return (
    <>
      {cur.out && (
        <div key={cur.out.k} ref={outRef} className={layerClass} aria-hidden style={{ pointerEvents: 'none' }}>
          {cur.out.node}
        </div>
      )}
      <div key={cur.k} ref={inRef} className={layerClass}>
        {children}
      </div>
    </>
  );
}

/* ---- the dial ---- */

const TURN_MS = 900;
const START = -135;
const SWEEP = 270;
const FAR_AT = 0.7;
const STOPS = SPRING.slice(7, -1).split(',').map(Number);

/* how far into the turn the indicator passes a fraction f of its travel, read back off the spring */
const passTime = (f: number): number => {
  for (let i = 1; i < STOPS.length; i++) {
    if (STOPS[i] >= f) {
      const a = STOPS[i - 1];
      const b = STOPS[i];
      const u = b === a ? 0 : (f - a) / (b - a);
      return ((i - 1 + u) / (STOPS.length - 1)) * TURN_MS;
    }
  }
  return TURN_MS;
};

interface Geo {
  knob: number;
  ticks: number;
  tickIn: number;
  tickOut: number;
  major: number;
  stroke: number;
  ind: [number, number];
  indW: number;
  knurl: boolean;
  dish: number;
}
const geoOf = (size: number): Geo => {
  const r = size / 2;
  if (size >= 150) return { knob: r - 24, ticks: 37, tickIn: r - 11, tickOut: r - 4, major: 3, stroke: 1.25, ind: [r - 58, r - 32], indW: 2, knurl: true, dish: r - 38 };
  if (size >= 90) return { knob: r - 16, ticks: 25, tickIn: r - 7, tickOut: r - 2.5, major: 2, stroke: 1, ind: [r - 34, r - 21], indW: 1.75, knurl: true, dish: r - 24 };
  if (size >= 48) return { knob: r - 9, ticks: 15, tickIn: r - 4.5, tickOut: r - 1, major: 0, stroke: 1, ind: [r - 17, r - 11], indW: 1.5, knurl: false, dish: 0 };
  if (size >= 36) return { knob: r - 7, ticks: 13, tickIn: r - 3.5, tickOut: r - 1, major: 0, stroke: 1, ind: [r - 13, r - 8.5], indW: 1.25, knurl: false, dish: 0 };
  return { knob: r - 5.5, ticks: 11, tickIn: r - 3, tickOut: r - 0.5, major: 0, stroke: 1, ind: [r - 10, r - 6.5], indW: 1.25, knurl: false, dish: 0 };
};

const polar = (r: number, deg: number, c: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [+(c + r * Math.cos(a)).toFixed(3), +(c + r * Math.sin(a)).toFixed(3)];
};

export function Dial({ size, value, delay = 0, farAt = FAR_AT }: { size: number; value: number; delay?: number; farAt?: number }) {
  const { jump } = useDeck();
  const c = size / 2;
  const g = useMemo(() => geoOf(size), [size]);
  const ticks = useMemo(
    () =>
      Array.from({ length: g.ticks }, (_, i) => {
        const t = i / (g.ticks - 1);
        const deg = START + SWEEP * t;
        const inner = g.major && i % (g.major * 2) === 0 ? g.tickIn - 2.5 : g.tickIn;
        const [x1, y1] = polar(inner, deg, c);
        const [x2, y2] = polar(g.tickOut, deg, c);
        return { t, x1, y1, x2, y2 };
      }),
    [g, c]
  );
  const knurl = useMemo(() => {
    if (!g.knurl) return [];
    return Array.from({ length: 96 }, (_, i) => {
      const [x1, y1] = polar(g.knob - 4, (i * 360) / 96, c);
      const [x2, y2] = polar(g.knob - 0.5, (i * 360) / 96, c);
      return { x1, y1, x2, y2 };
    });
  }, [g, c]);

  /* each tick lights the moment the indicator passes it */
  const prev = useRef(value);
  const from = prev.current;
  useLayoutEffect(() => {
    prev.current = value;
  }, [value]);
  const tickDelay = (t: number) => {
    if (jump || from === value) return undefined;
    const lo = Math.min(from, value);
    const hi = Math.max(from, value);
    if (t < lo || t > hi) return `${delay}ms`;
    return `${Math.round(delay + passTime(Math.abs(t - from) / (hi - lo)))}ms`;
  };

  const [ix1, iy1] = polar(g.ind[0], 0, c);
  const [ix2, iy2] = polar(g.ind[1], 0, c);
  return (
    <span className={cx('dk-dial', size >= 90 && 'dk-dial-big')} style={{ width: size, height: size }}>
      <svg className="dk-dial-ticks" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {ticks.map((k, i) => {
          const on = k.t <= value + 1e-6;
          return (
            <line
              key={i}
              x1={k.x1}
              y1={k.y1}
              x2={k.x2}
              y2={k.y2}
              strokeWidth={g.stroke}
              className={cx('dk-tick', on && (k.t > farAt ? 'far' : 'on'))}
              style={{ transitionDelay: tickDelay(k.t) }}
            />
          );
        })}
      </svg>
      <span className="dk-knob" style={{ inset: c - g.knob }} />
      <svg
        className="dk-rotor"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        style={{ transform: `rotate(${START + SWEEP * value}deg)`, transitionDelay: delay ? `${delay}ms` : undefined, transformOrigin: `${c}px ${c}px` }}
      >
        {knurl.map((k, i) => (
          <line key={i} {...k} className="dk-knurl" />
        ))}
        {g.dish > 0 && <circle cx={c} cy={c} r={g.dish} className="dk-dish" />}
        <line x1={ix1} y1={iy1} x2={ix2} y2={iy2} strokeWidth={g.indW} className="dk-ind" />
      </svg>
    </span>
  );
}
