/* The coin: b53's star coin in our language. A yellow pill with the amount rises out of what you did, holds with its
   reason, then travels on an arc into the level badge. Inline styles and CSS transitions only, timed by clock, so it
   runs the same in the main page and in the Document PiP window (no stylesheet, no rAF needed in either). */
import { clock } from '../clock';
import { SNAP } from '../stage/parts/util';

export const FLY = { rise: 450, hold: 600, travel: 850, gap: 250, count: 900, out: 160, lift: 14, gone: 24 } as const;

/* test rail only: stretch every duration so a frame can be shot mid flight. 1 is real time */
let K = 1;
export const setSlow = (k: number) => {
  K = Number.isFinite(k) && k > 0 ? k : 1;
};
export const ms = (v: number) => v * K;

/* the two axes ease differently, so the path bends: the lift leads, the sideways move follows */
const EASE_X = 'cubic-bezier(.5,0,.2,1)';
const EASE_Y = 'cubic-bezier(.3,.2,.2,1)';
const EASE = 'cubic-bezier(.2,0,0,1)';

const COIN =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style="display:block;flex:none"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.6l1 2.1 2.3.3-1.7 1.6.4 2.3L8 9.8l-2 1.1.4-2.3-1.7-1.6 2.3-.3z" fill="currentColor"/></svg>';

export interface Flight {
  doc: Document;
  rect: DOMRect;
  amount: number;
  reason: string;
  /* asked when the coin leaves, so it finds the badge where it is now */
  target: () => Element | null;
  onLand: () => void;
}

const fmt = (v: number) => v.toLocaleString('en-US');

export const reducedIn = (doc: Document): boolean => {
  try {
    return !!doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const centre = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + Math.min(r.height, 64) / 2 });

/* Returns a cancel. Cancelling removes the coin and never lands it. */
export function flyCoin(f: Flight): () => void {
  const { doc } = f;
  const timers: number[] = [];
  let done = false;
  const later = (fn: () => void, ms: number) => timers.push(clock.setTimeout(() => !done && fn(), ms));

  const o = centre(f.rect);
  const ax = doc.createElement('div');
  ax.setAttribute('aria-hidden', 'true');
  ax.style.cssText = `position:fixed;left:${o.x}px;top:${o.y}px;width:0;height:0;z-index:2147483000;pointer-events:none;transition:transform ${ms(FLY.travel)}ms ${EASE_X}`;
  const ay = doc.createElement('div');
  ay.style.cssText = `width:0;height:0;transition:transform ${ms(FLY.travel)}ms ${EASE_Y}`;
  const mid = doc.createElement('div');
  mid.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-50%)';
  const pill = doc.createElement('div');
  pill.style.cssText = [
    'display:flex',
    'align-items:center',
    'gap:5px',
    'height:28px',
    'padding:0 11px 0 8px',
    'border-radius:99px',
    'background:#FACC15',
    'color:#131417',
    'white-space:nowrap',
    "font:500 14px/20px var(--zj-font,'Inter',system-ui,sans-serif)",
    'font-variant-numeric:tabular-nums',
    'letter-spacing:-.006em',
    "font-feature-settings:'cv11','ss01'",
    '-webkit-font-smoothing:antialiased',
    `transform:translateY(8px) scale(.6)`,
    'filter:blur(4px)',
    'opacity:0',
    `transition:transform ${ms(FLY.rise)}ms ${SNAP},filter ${ms(280)}ms ${EASE},opacity ${ms(160)}ms ${EASE}`,
  ].join(';');
  pill.innerHTML = COIN;
  const amt = doc.createElement('span');
  amt.textContent = `+${fmt(f.amount)}`;
  const why = doc.createElement('span');
  why.textContent = f.reason;
  why.style.cssText = `display:block;max-width:240px;overflow:hidden;text-overflow:ellipsis;margin-left:3px;font-weight:400;font-size:12px;line-height:16px;color:rgba(19,20,23,.72);transition:max-width ${ms(280)}ms ${EASE},margin ${ms(280)}ms ${EASE},opacity ${ms(160)}ms ${EASE}`;
  pill.append(amt, why);
  mid.appendChild(pill);
  ay.appendChild(mid);
  ax.appendChild(ay);
  (doc.body ?? doc.documentElement).appendChild(ax);
  void pill.offsetWidth;

  /* 1. it rises out of what you did */
  pill.style.transform = `translateY(-${FLY.lift}px) scale(1)`;
  pill.style.filter = 'blur(0px)';
  pill.style.opacity = '1';

  const finish = () => {
    done = true;
    timers.forEach((t) => clock.clearTimeout(t));
    ax.remove();
  };

  /* 2. it holds with its reason, 3. it travels */
  later(() => {
    why.style.maxWidth = '0px';
    why.style.marginLeft = '0px';
    why.style.opacity = '0';
    const t = f.target();
    const r = t && t.isConnected ? t.getBoundingClientRect() : null;
    if (!r || r.width < 1) {
      /* nowhere to land: it lifts away where it is and the count still goes up */
      pill.style.transition = `transform ${ms(FLY.rise)}ms ${EASE_X},filter ${ms(280)}ms ${EASE},opacity ${ms(320)}ms ${EASE}`;
      pill.style.transform = `translateY(-${FLY.lift + FLY.gone}px) scale(0)`;
      pill.style.opacity = '0';
      later(() => {
        f.onLand();
        finish();
      }, ms(FLY.rise));
      return;
    }
    const d = { x: r.left + r.width / 2 - o.x, y: r.top + r.height / 2 - o.y };
    pill.style.transition = `transform ${ms(FLY.travel)}ms ${EASE_X},filter ${ms(280)}ms ${EASE},opacity ${ms(160)}ms ${EASE}`;
    pill.style.transform = 'translateY(0px) scale(.6)';
    ax.style.transform = `translateX(${d.x}px)`;
    ay.style.transform = `translateY(${d.y}px)`;
    /* 4. it goes into the badge */
    later(() => {
      f.onLand();
      pill.style.transition = `transform ${ms(FLY.out)}ms ${EASE},opacity ${ms(FLY.out)}ms ${EASE}`;
      pill.style.transform = 'translateY(0px) scale(.3)';
      pill.style.opacity = '0';
      later(finish, ms(FLY.out) + 20);
    }, ms(FLY.travel));
  }, ms(FLY.rise + FLY.hold));

  return finish;
}
