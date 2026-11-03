/* b16 (his note: "this should be full screen and not in a container and it should transition into this screen ... at this
   point the user can only skip and go back and pause and play, simple"): before the meeting she walks up to you, the whole
   window, nothing on it but back, play or pause, and Skip. When she is done, or you skip, the picture closes down into the
   meeting's frame and her hello at the desk carries on there. A stand-in walk from the Stripe kickoff until Spotify's is shot */
import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft } from 'lucide-react';
import { useDevAction } from '../dev/store';
import { prefersReduced, SPRING } from '../stage/parts/util';
import { sfx } from './prefs';

export const WALK_SRC = 'static/media/eryn-walk.mp4';
const CLOSE_MS = 980;
const BUTTER = 'cubic-bezier(0.32, 0.72, 0, 1)';

export default function Walk({ frame, onBack, onDone }: { frame: React.RefObject<HTMLDivElement | null>; onBack: () => void; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const closing = useRef(false);

  /* it shrinks into the meeting's frame: the frame's own rect and corner, then it is gone and the frame plays on */
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const v = video.current;
    v?.pause();
    const el = root.current;
    const fr = frame.current;
    if (!el || !fr || prefersReduced(el)) return onDone();
    const r = fr.getBoundingClientRect();
    const rad = parseFloat(getComputedStyle(fr).borderTopLeftRadius) || 24;
    const to = `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round ${rad}px)`;
    /* b20 (his note: "a better smooth transition from the kickoff to the manager, super smooth like butter"): the walk
       settles into the frame on one long soft curve, and in its last stretch it melts, blur to clear, into her desk
       already waiting underneath, so there is no cut */
    el.style.background = 'transparent';
    el.querySelectorAll<HTMLElement>('.wk-bk, .wk-skip').forEach((b) =>
      b.animate([{ transform: 'none', filter: 'blur(0px)', opacity: 1 }, { transform: 'scale(.9)', filter: 'blur(6px)', opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' })
    );
    const a = el.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: to }], { duration: CLOSE_MS, easing: BUTTER, fill: 'forwards' });
    v?.animate(
      [
        { filter: 'blur(0px)', opacity: 1, offset: 0 },
        { filter: 'blur(0px)', opacity: 1, offset: 0.55 },
        { filter: 'blur(12px)', opacity: 0, offset: 1 },
      ],
      { duration: CLOSE_MS, easing: 'ease-in-out', fill: 'forwards' }
    );
    a.onfinish = () => onDone();
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  const toggle = () => {
    const v = video.current;
    if (!v || closing.current) return;
    sfx.click();
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  };
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;

  useLayoutEffect(() => {
    const el = root.current;
    if (el && !prefersReduced(el)) el.animate([{ transform: 'scale(1.04)', filter: 'blur(10px)' }, { transform: 'none', filter: 'none' }], { duration: 620, easing: SPRING });
    void video.current?.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        toggleRef.current();
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        onBack();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onBack]);

  useDevAction('walk-skip', 'Skip her walk', () => closeRef.current());

  /* on the body, over the HUD: nothing but the walk, back and Skip; a click on the picture plays or pauses */
  return createPortal(
    <div ref={root} className="wk zd" role="dialog" aria-label="Eryn walks up to you">
      <video
        ref={video}
        className="wk-v"
        src={WALK_SRC}
        playsInline
        preload="auto"
        onClick={toggle}
        onEnded={() => closeRef.current()}
      />
      <button
        type="button"
        className="wk-bk"
        aria-label="Back"
        onClick={() => {
          sfx.click();
          onBack();
        }}
      >
        <ChevronLeft size={18} strokeWidth={2} />
      </button>
      <button
        type="button"
        className="wk-skip"
        onClick={() => {
          sfx.click();
          close();
        }}
      >
        Skip
      </button>
    </div>,
    document.body
  );
}
