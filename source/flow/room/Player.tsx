/* b36's bar at the foot of the film: play, time, the chapters as one track, the total,
   one speed key and one settings key. Fills and the head are patched straight to the DOM, never re-rendered.
   b11: at rest only the progress line shows, one cell a chapter, filling as she talks. The bar rises on a grey gradient
   while the pointer is over the film (his note: "only a progress bar ... when a mouse hovers, the play, the timer"). */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Captions, Pause, Play, Settings, Volume2 } from 'lucide-react';
import { kick, kickSpeed, kickToggle, useKick } from './kickoff';
import { SPEEDS, setSound, sfx, usePrefs } from './prefs';
import { mss } from './timeline';

function Track({ onSeek }: { onSeek: (T: number) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLSpanElement>(null);
  const drag = useRef<number | null>(null);
  const run = kick.run();
  const offs = kick.offsets();
  const [tip, setTip] = useState<number | null>(null);

  useEffect(() => {
    const paint = () => {
      const el = host.current;
      if (!el) return;
      const { seg, t, max, replay } = useKick.getState();
      const at = drag.current;
      let hx = 0;
      el.querySelectorAll<HTMLElement>('.rm-cell').forEach((cell, i) => {
        const dur = run.segments[i].audio_duration_sec || 1;
        let played: number;
        if (at !== null) played = Math.max(0, Math.min(1, (at - offs[i]) / dur));
        else played = i < seg ? 1 : i > seg ? 0 : Math.min(1, t / dur);
        const seen = Math.max(0, Math.min(1, (max - offs[i]) / dur));
        const p = cell.querySelector<HTMLElement>('.rm-cell-p');
        const w = cell.querySelector<HTMLElement>('.rm-cell-w');
        if (p) p.style.transform = `scaleX(${played})`;
        if (w) w.style.transform = `scaleX(${Math.max(seen, played)})`;
        cell.dataset.open = String(replay || offs[i] <= max + 1e-3);
        if ((at === null && i === seg) || (at !== null && played > 0 && played < 1) || (at !== null && played === 1)) {
          hx = cell.offsetLeft + played * cell.offsetWidth;
        }
      });
      if (head.current) head.current.style.transform = `translateX(${hx}px)`;
    };
    paint();
    const off = useKick.subscribe(paint);
    window.addEventListener('resize', paint);
    return () => {
      off();
      window.removeEventListener('resize', paint);
    };
  }, [run, offs]);

  /* a point on the track as a second on the whole timeline */
  const at = (x: number): number => {
    const cells = host.current?.querySelectorAll<HTMLElement>('.rm-cell');
    if (!cells?.length) return 0;
    for (let i = 0; i < cells.length; i++) {
      const r = cells[i].getBoundingClientRect();
      if (x <= r.right + 1.5 || i === cells.length - 1) {
        const f = Math.max(0, Math.min(1, (x - r.left) / r.width));
        return offs[i] + f * run.segments[i].audio_duration_sec;
      }
    }
    return 0;
  };

  const clampT = (T: number) => {
    const s = useKick.getState();
    return Math.min(T, s.replay ? kick.total() : s.max);
  };

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    drag.current = clampT(at(e.clientX));
    useKick.setState({});
    const move = (ev: PointerEvent) => {
      drag.current = clampT(at(ev.clientX));
      useKick.setState({});
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      const T = drag.current;
      drag.current = null;
      if (T !== null) onSeek(T);
      useKick.setState({});
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };

  return (
    <div ref={host} className="rm-track" onPointerDown={down} onPointerLeave={() => setTip(null)}>
      {run.segments.map((s, i) => (
        <div key={s.id} className="rm-cell" style={{ flexGrow: s.audio_duration_sec }} onPointerEnter={() => setTip(i)}>
          <i className="rm-cell-t">
            <b className="rm-cell-w" />
            <b className="rm-cell-p" />
          </i>
          {tip === i && <span className="rm-tip">{s.label}</span>}
        </div>
      ))}
      <span ref={head} className="rm-head" aria-hidden />
    </div>
  );
}

/* the film's progress at rest: the chapters as one thin line along the foot of the film */
function Line() {
  const host = useRef<HTMLDivElement>(null);
  const run = kick.run();
  useEffect(() => {
    const paint = () => {
      const { seg, t } = useKick.getState();
      host.current?.querySelectorAll<HTMLElement>('.rm-lc i').forEach((fill, i) => {
        const dur = run.segments[i].audio_duration_sec || 1;
        const p = i < seg ? 1 : i > seg ? 0 : Math.min(1, t / dur);
        const tr = `scaleX(${p.toFixed(4)})`;
        if (fill.style.transform !== tr) fill.style.transform = tr;
      });
    };
    paint();
    return useKick.subscribe(paint);
  }, [run]);
  return (
    <div ref={host} className="rm-line" aria-hidden>
      {run.segments.map((x) => (
        <span key={x.id} className="rm-lc" style={{ flexGrow: x.audio_duration_sec }}>
          <i />
        </span>
      ))}
    </div>
  );
}

function Time({ total }: { total?: boolean }) {
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (total) {
      if (el.current) el.current.textContent = mss(kick.total());
      return;
    }
    let last = '';
    const paint = () => {
      const { seg, t } = useKick.getState();
      const txt = mss(kick.offsets()[seg] + t);
      if (txt !== last && el.current) {
        last = txt;
        el.current.textContent = txt;
      }
    };
    paint();
    return useKick.subscribe(paint);
  }, [total]);
  return <span ref={el} className="rm-tm" />;
}

function Switch({ on }: { on: boolean }) {
  return <span className="rm-sw" data-on={on ? '1' : '0'} aria-hidden />;
}

export default function Player({ onSeek, canPlay }: { onSeek: (T: number) => void; canPlay: boolean }) {
  const playing = useKick((s) => s.playing);
  const speed = usePrefs((s) => s.speed);
  const cc = usePrefs((s) => s.cc);
  const sound = usePrefs((s) => s.sound);
  const [open, setOpen] = useState(false);
  const gear = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!gear.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', away, true);
    window.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away, true);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  const nextSpeed = (e: React.MouseEvent<HTMLButtonElement>) => {
    sfx.click();
    const now = usePrefs.getState().speed;
    kickSpeed(SPEEDS[(SPEEDS.indexOf(now) + 1) % SPEEDS.length]);
    e.currentTarget.blur();
  };

  return (
    <>
    <Line />
    <span className="rm-grad" aria-hidden />
    <div className="rm-ctl" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="rm-b rm-pp"
        aria-label={playing ? 'Pause' : 'Play'}
        disabled={!canPlay}
        onClick={(e) => {
          sfx.click();
          kickToggle();
          e.currentTarget.blur();
        }}
      >
        {playing ? <Pause size={14} strokeWidth={2} fill="currentColor" /> : <Play size={14} strokeWidth={2} fill="currentColor" />}
      </button>
      <Time />
      <Track onSeek={onSeek} />
      <Time total />
      <span className="rm-grp">
        <button type="button" className="rm-spd" onClick={nextSpeed} aria-label={`Speed, ${speed}x`}>
          {speed}x
        </button>
        <span ref={gear} className="rm-gear">
          <button type="button" className="rm-b" data-on={open ? '1' : '0'} aria-label="Captions and sound" aria-expanded={open} onClick={() => setOpen(!open)}>
            <Settings size={14} strokeWidth={2} />
          </button>
          <span className="rm-sets" data-on={open ? '1' : '0'} role="menu" aria-hidden={!open}>
            <button
              type="button"
              className="rm-sr"
              role="menuitemcheckbox"
              aria-checked={cc}
              tabIndex={open ? 0 : -1}
              onClick={() => {
                sfx.click();
                usePrefs.setState({ cc: !cc });
              }}
            >
              <Captions size={16} strokeWidth={1.75} />
              Captions
              <Switch on={cc} />
            </button>
            <button
              type="button"
              className="rm-sr"
              role="menuitemcheckbox"
              aria-checked={sound}
              tabIndex={open ? 0 : -1}
              onClick={() => {
                setSound(!sound);
                sfx.click();
              }}
            >
              <Volume2 size={16} strokeWidth={1.75} />
              Sound
              <Switch on={sound} />
            </button>
          </span>
        </span>
      </span>
    </div>
    </>
  );
}

