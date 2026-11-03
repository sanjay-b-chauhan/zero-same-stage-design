/* b17 (his note, 3 Nov: "when you level up there should be crazy motions like Job portal level up ... takes the full screen"):
   a level reached plays the job portal's own celebration (st25, as it ships, static/levelup) over the whole screen.
   It loads hidden, starts once it is ready, and goes away when the portal closes it, on Escape, or if it never opens. */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const POLL_MS = 80;
const VEIL = 'html,body{background:transparent!important}body>*:not(#lvx):not(:has(#lvx)){visibility:hidden!important}';
const GIVE_UP = 40; /* polls before it opens: 8 s */

type PortalWindow = Window & { eval: (code: string) => unknown };

export default function LevelBurst({ level, gain, onDone }: { level: number; gain: number; onDone: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [shown, setShown] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const f = frame.current;
    if (!f) return;
    let dead = false;
    let t = 0;
    const finish = () => {
      if (dead) return;
      dead = true;
      done.current();
    };
    const start = () => {
      const w = f.contentWindow as PortalWindow | null;
      if (!w || dead) return;
      try {
        /* b31 (his note: "I could see a job portal UI like level 1, level 5, level 10 ... it should directly transition
           to this screen only"): the portal under the celebration never shows */
        const veil = w.document.createElement('style');
        veil.textContent = VEIL;
        w.document.head.appendChild(veil);
        w.eval("lxLoad(); A.f9try('lu')");
        w.focus();
      } catch {
        return finish();
      }
      setShown(true);
      let seen = false;
      let n = 0;
      const poll = () => {
        if (dead) return;
        let open = false;
        try {
          open = !!w.document.getElementById('lvx');
        } catch {
          open = false;
        }
        if (open) seen = true;
        if ((seen && !open) || (!seen && ++n > GIVE_UP)) return finish();
        t = window.setTimeout(poll, POLL_MS);
      };
      t = window.setTimeout(poll, POLL_MS);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    f.addEventListener('load', start, { once: true });
    window.addEventListener('keydown', esc);
    return () => {
      dead = true;
      window.clearTimeout(t);
      f.removeEventListener('load', start);
      window.removeEventListener('keydown', esc);
    };
  }, []);

  return createPortal(
    <div className="zh-burst" data-on={shown || undefined}>
      <iframe ref={frame} title={`Level ${level}`} src={`static/levelup/index.html?level=${level}&look=5&start=badge&gain=${Math.max(1, Math.round(gain))}`} />
    </div>,
    document.body
  );
}
