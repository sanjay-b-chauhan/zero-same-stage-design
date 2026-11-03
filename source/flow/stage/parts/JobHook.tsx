/* b21 (his note: "put the job portal in as the hook ... after completing this, all those job roles are waiting for you,
   and add the visual below One clear recommendation, the company logos and text"): the roles this project's work
   lands you closer to, read from the job portal (zero-loop-assets-b53 roles.js and ranks.js, v77's own roles and pay).
   On the objective it is a short list under the finish line; in the turn between stages it is the logos and one line */
import { ChevronRight } from 'lucide-react';
import { openHud } from '../../hud';
import { favicon } from '../../hud/ranks';
import './jobhook.css';

interface HookRole {
  t: string;
  co: string;
  dom: string;
  pay: string;
}

const ROLES: HookRole[] = [
  { t: 'Pricing & Order Operations Analyst', co: 'Fivetran', dom: 'fivetran.com', pay: '$104k to 125k' },
  { t: 'GTM Strategy/Operations Associate', co: 'Datadog', dom: 'datadoghq.com', pay: '$100k to 133k' },
  { t: 'Senior Data Analyst', co: 'Clutch', dom: 'clutch.ca', pay: 'CA$100k to 125k' },
];

export const HOOK_LINE = `${ROLES.length} roles are waiting at the end of this`;

function Stack() {
  return (
    <span className="jh-stack" aria-hidden>
      {ROLES.map((r, i) => (
        <img key={r.dom} src={favicon(r.dom)} alt="" draggable={false} style={{ zIndex: ROLES.length - i }} />
      ))}
    </span>
  );
}

/* b27 (his note: "remove the dotted version, and also remove this. When they click it, it can open up the level thing
   that we have on the top right"): one solid hairline pill, no popover. A click opens the Level panel in the top right */
export function JobHookList() {
  return (
    <div className="jh-hook">
      <button type="button" className="jh-strip jh-light jh-dot" data-jh aria-label={`${HOOK_LINE}. Open your level`} onClick={() => openHud('level')}>
        <Stack />
        <span className="jh-t">{HOOK_LINE}</span>
        <ChevronRight className="jh-chev" size={16} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

export function JobHookStrip() {
  return (
    <div className="jh-strip">
      <Stack />
      <span className="jh-t">{HOOK_LINE}</span>
    </div>
  );
}
