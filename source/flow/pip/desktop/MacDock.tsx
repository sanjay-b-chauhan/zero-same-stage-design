/* The macOS Dock with the real app icons from this Mac: Finder, Zero, Chrome, Google Sheets, Claude.
   Hover names the app above it, a press darkens it like the real one, a launch bounces it once, a dot marks what is running.
   Zero is the way back: its window grows out of the icon. Sheets and Claude open their windows out of their icons. */
import { useLayoutEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { useFlow } from '../../engine/store';
import { FIRM, FIRM_MS, prefersReduced } from '../../stage/parts/util';
import { bounceDock, focusWin, openDesktopApp, setFront, spot, useDesk, type Rect } from './deskStore';
import chromeIcon from './icons/chrome.png';
import claudeIcon from './icons/claude.png';
import finderIcon from './icons/finder.png';
import sheetsIcon from './icons/sheets.png';
import zeroIcon from './icons/zero.png';

type DockApp = 'finder' | 'zero' | 'chrome' | 'sheets' | 'claude';

const APPS: Array<{ id: DockApp; name: string; icon: string }> = [
  { id: 'finder', name: 'Finder', icon: finderIcon },
  { id: 'zero', name: 'Zero', icon: zeroIcon },
  { id: 'chrome', name: 'Google Chrome', icon: chromeIcon },
  { id: 'sheets', name: 'Google Sheets', icon: sheetsIcon },
  { id: 'claude', name: 'Claude', icon: claudeIcon },
];

const BOUNCE_PX = 16;

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

/* where an app's window goes back into when it is minimised or closed: its own icon */
export const iconRect = (app: string): Rect | null => {
  const el = document.querySelector(`.zmac-dock [data-app='${app}'] img`);
  return el ? rectOf(el) : null;
};

function Icon({ id, name, icon }: { id: DockApp; name: string; icon: string }) {
  const img = useRef<HTMLImageElement>(null);
  const bounce = useDesk((d) => (d.bounce?.app === id ? d.bounce.n : 0));
  const running = useDesk((d) => (id === 'finder' || id === 'zero' ? true : id === 'chrome' ? d.running.chrome : d.wins[id].open));
  const a = useFlow((s) => s.actions);

  /* a launch hops once on the firm spring and lands */
  useLayoutEffect(() => {
    const el = img.current;
    if (!bounce || !el || prefersReduced(el)) return;
    el.animate(
      [{ transform: 'translateY(0)' }, { transform: `translateY(-${BOUNCE_PX}px)`, offset: 0.4 }, { transform: 'translateY(0)' }],
      { duration: FIRM_MS + 220, easing: FIRM }
    );
  }, [bounce]);

  const onClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    const at = img.current ? rectOf(img.current) : rectOf(e.currentTarget);
    if (id === 'zero') {
      /* back to Zero, growing out of this icon */
      spot.back = at;
      a.setSurface('big');
      return;
    }
    if (id === 'finder') {
      setFront('finder');
      return;
    }
    if (id === 'chrome') {
      if (!useDesk.getState().running.chrome) {
        useDesk.setState({ running: { chrome: true } });
        bounceDock('chrome');
      }
      setFront('chrome');
      return;
    }
    const w = useDesk.getState().wins[id];
    if (w.open && !w.min) {
      focusWin(id);
      return;
    }
    openDesktopApp(id, { from: at });
  };

  return (
    <li className="zmac-dock-item" data-app={id}>
      <button type="button" className="zmac-dock-key" aria-label={name} onClick={onClick}>
        <img ref={img} src={icon} alt="" draggable={false} />
      </button>
      <span className="zmac-dock-tip" aria-hidden>
        {name}
      </span>
      <i className="zmac-dock-dot" data-on={running || undefined} aria-hidden />
    </li>
  );
}

export default function MacDock() {
  return (
    <nav className="zmac-dock" aria-label="Dock">
      <ul className="zmac-dock-row">
        {APPS.map((x) => (
          <Icon key={x.id} {...x} />
        ))}
      </ul>
    </nav>
  );
}
