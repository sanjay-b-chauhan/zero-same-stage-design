/* The small pieces the pill, the sheets and the PiP chip share. */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Lock } from 'lucide-react';
import { clock } from '../clock';
import { FLY, ms } from './flight';
import { favicon, roleTitle, type RankRole } from './ranks';

/* absolute, so the same src works inside the PiP document */
export const asset = (path: string) => {
  try {
    return new URL(path, document.baseURI).href;
  } catch {
    return path;
  }
};

export const badgeSrc = (level: number) => asset(`static/badges/b${Math.max(1, Math.min(10, level))}.webp`);

export const fmt = (v: number) => Math.round(v).toLocaleString('en-US');

/* the badge with a number you can read on top of it, as in b53 */
export function Badge({ level, size, num = true, lock = false }: { level: number; size: number; num?: boolean; lock?: boolean }) {
  return (
    <span className="zh-bdg" data-lock={lock || undefined} data-big={size >= 40 || undefined} style={{ '--s': `${size}px` } as CSSProperties}>
      <img src={badgeSrc(level)} alt="" draggable={false} />
      {num && <b>{level}</b>}
    </span>
  );
}

export function Bar({ p, className = 'zh-bar' }: { p: number; className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      <i style={{ width: `${Math.max(0, Math.min(1, p)) * 100}%` }} />
    </span>
  );
}

/* "Level 1", and for a moment after a coin lands, the XP counting up in its place */
export function Roll({ level, shown, total, xp }: { level: number; shown: number; total: number; xp: boolean }) {
  return (
    <span className="zh-roll" data-xp={xp || undefined}>
      <span className="zh-roll-l">Level {level}</span>
      <span className="zh-roll-x">{fmt(shown)} XP</span>
      <span className="zh-roll-s" aria-hidden="true">
        {fmt(Math.max(total, shown))} XP
      </span>
    </span>
  );
}

/* true while a coin's count shows, then back to the level */
export function useReadout(gain: number): boolean {
  const [on, setOn] = useState(false);
  const last = useRef(gain);
  useEffect(() => {
    if (gain <= last.current) {
      last.current = gain;
      return;
    }
    last.current = gain;
    setOn(true);
    const t = clock.setTimeout(() => setOn(false), ms(FLY.count) + 900);
    return () => clock.clearTimeout(t);
  }, [gain]);
  return on;
}

export function RoleRow({ r }: { r: RankRole }) {
  return (
    <div className="zh-role">
      <span className="zh-logo">
        <img src={favicon(r.dom)} alt="" />
      </span>
      <span className="zh-role-m">
        <span className="zh-role-t">{roleTitle(r.t)}</span>
        <span className="zh-m">
          {r.co} · {r.pay}
        </span>
      </span>
    </div>
  );
}

export function MoreRow({ count }: { count: number }) {
  return (
    <div className="zh-role zh-more">
      <span className="zh-lock">
        <Lock size={14} strokeWidth={1.75} />
      </span>
      <span className="zh-more-t">{count} more roles</span>
    </div>
  );
}
