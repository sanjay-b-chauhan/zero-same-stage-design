/* What grows out of the pill. Level: where you are, what the next level opens, what this project paid.
   Coach: Navid, what he watches right now, and his rule. No chat: he never does the work, the manager owns it. */
import { useFlow } from '../engine/store';
import { asset, Badge, Bar, fmt, MoreRow, RoleRow } from './parts';
import { COACH, watching } from './coach';
import { rankOf } from './ranks';
import { intoLevel, levelOf, PER_LEVEL, useXp } from './xp';

export function LevelSheet() {
  const shown = useXp((s) => s.shown);
  const log = useXp((s) => s.log);
  const L = levelOf(shown);
  const next = L < 10 ? rankOf(L + 1) : null;
  const toNext = Math.max(0, L * PER_LEVEL - shown);
  const lines = log.filter((l) => l.landed).slice(-5).reverse();
  return (
    <div className="zh-view">
      <div className="zh-hero">
        <Badge level={L} size={44} />
        <div className="zh-hero-m">
          <div className="zh-hero-t">
            <span className="zh-ink zh-w5">Level {L}</span>
            <span className="zh-ink zh-num">{fmt(shown)} XP</span>
          </div>
          <Bar p={intoLevel(shown)} className="zh-track" />
          <span className="zh-m">{L < 10 ? `${fmt(toNext)} XP to Level ${L + 1}` : 'Top level'}</span>
        </div>
      </div>

      {next && (
        <section className="zh-sec">
          <div className="zh-sh">
            <Badge level={next.n} size={20} num={false} lock />
            <span className="zh-ink zh-w5">
              Level {next.n} opens {next.count} roles
            </span>
          </div>
          <div className="zh-rows">
            {next.roles.slice(0, 2).map((r) => (
              <RoleRow key={r.t + r.co} r={r} />
            ))}
            {next.count > 2 && <MoreRow count={next.count - 2} />}
          </div>
        </section>
      )}

      {lines.length > 0 && (
        <section className="zh-sec">
          <div className="zh-sh">
            <span className="zh-ink zh-w5">This project</span>
          </div>
          <ul className="zh-lines">
            {lines.map((l) => (
              <li key={l.id}>
                <span className="zh-amt">+{fmt(l.amount)}</span>
                <span className="zh-why">{l.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function CoachSheet() {
  const screen = useFlow((s) => s.screen);
  const stage = useFlow((s) => s.stage);
  return (
    <div className="zh-view zh-coach">
      <div className="zh-who">
        <img className="zh-face zh-face-l" src={asset(COACH.face)} alt="" draggable={false} />
        <div className="zh-who-m">
          <span className="zh-ink zh-w5">{COACH.name}</span>
          <span className="zh-m">{COACH.role}</span>
        </div>
      </div>
      <p className="zh-watch">{watching(screen, stage)}</p>
      <p className="zh-rule">{COACH.rule}</p>
    </div>
  );
}

/* a level reached: a small sheet drops under the pill for a moment, then goes back up */
export function LevelUp({ level, on }: { level: number; on: boolean }) {
  const r = rankOf(level);
  return (
    <div className="zh-up" data-on={on || undefined} role="status" aria-live="polite">
      <div className="zh-up-h">
        <Badge level={level} size={44} />
        <div className="zh-who-m">
          <span className="zh-ink zh-w5">Level {level}</span>
          {r && <span className="zh-m">{r.count} roles open now</span>}
        </div>
      </div>
      {r?.roles[0] && <RoleRow r={r.roles[0]} />}
    </div>
  );
}
