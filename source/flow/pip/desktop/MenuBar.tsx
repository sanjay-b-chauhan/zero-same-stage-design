/* The macOS menu bar: the Apple mark, the front app's name, its real menus. On the right the status items and the clock,
   in macOS's own format, ticking on the minute. Menus press like the real ones but open nothing: it is the OS, not the work. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BatteryFull, Search, Wifi } from 'lucide-react';
import { clock } from '../../clock';
import { rise } from '../../stage/parts/util';
import { useDesk, type FrontApp } from './deskStore';

const NAME: Record<FrontApp, string> = {
  zero: 'Zero',
  finder: 'Finder',
  chrome: 'Google Chrome',
  sheets: 'Google Sheets',
  claude: 'Claude',
};

const MENUS: Record<FrontApp, string[]> = {
  zero: ['File', 'Edit', 'View', 'Window', 'Help'],
  finder: ['File', 'Edit', 'View', 'Go', 'Window', 'Help'],
  chrome: ['File', 'Edit', 'View', 'History', 'Bookmarks', 'Profiles', 'Tab', 'Window', 'Help'],
  sheets: ['File', 'Edit', 'View', 'Window', 'Help'],
  claude: ['File', 'Edit', 'View', 'Window', 'Help'],
};

/* Mon 2 Nov 7:06 PM */
const stamp = (d: Date): string => {
  const day = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} ${date} ${time}`;
};

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let id = 0;
    /* wake on the next whole minute, then every minute, so it turns over when the real one does */
    const arm = () => {
      const d = new Date();
      id = clock.setTimeout(() => {
        setNow(new Date());
        arm();
      }, 60_000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 20);
    };
    arm();
    return () => clock.clearTimeout(id);
  }, []);
  return <span className="zmac-clock">{stamp(now)}</span>;
}

export default function MenuBar() {
  const front = useDesk((d) => d.front);
  const app = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  /* a new front app: its name and menus come in where the last ones were */
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    rise(app.current, { y: 4, blur: 3, ms: 360 });
  }, [front]);

  return (
    <div className="zmac-menubar" role="menubar" aria-label="Menu bar">
      <div className="zmac-menus">
        <button type="button" className="zmac-menu zmac-apple" aria-label="Apple menu">
          <img src="static/logos/apple.svg" alt="" draggable={false} />
        </button>
        <span ref={app} key={front} className="zmac-app">
          <button type="button" className="zmac-menu zmac-appname">
            {NAME[front]}
          </button>
          {MENUS[front].map((m) => (
            <button key={m} type="button" className="zmac-menu">
              {m}
            </button>
          ))}
        </span>
      </div>
      <div className="zmac-status">
        <button type="button" className="zmac-menu zmac-st" aria-label="Battery">
          <BatteryFull size={18} strokeWidth={1.5} />
        </button>
        <button type="button" className="zmac-menu zmac-st" aria-label="Wi-Fi">
          <Wifi size={15} strokeWidth={2} />
        </button>
        <button type="button" className="zmac-menu zmac-st" aria-label="Spotlight">
          <Search size={14} strokeWidth={2} />
        </button>
        <button type="button" className="zmac-menu">
          <Clock />
        </button>
      </div>
    </div>
  );
}
