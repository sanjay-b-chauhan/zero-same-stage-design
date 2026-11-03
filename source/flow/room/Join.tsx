/* b33 (his note: "when the senior intro happens, it goes to a white screen. That should also be like 'Join Now' under
   'Understand this scope, your manager, and Join Now' ... When you click 'Join Now,' it transitions into the kickoff video,
   where it says, 'Hey, I'm your manager' ... I need that really, really good transition"). The real kickoff's landing
   (KM/index.tsx, Landing before Join) on the light page: the title, her face, name and role, how long it runs, Join Now.
   Her walk closes down into her face on this card. Join Now opens the film back out of that face: the hello starts on
   the click and the film grows from her face's own circle in the video to the whole frame. WAAPI only. */
import { useLayoutEffect, useRef } from 'react';
import { Clock3 } from 'lucide-react';
import { useFlow } from '../engine/store';
import { prefersReduced, rise, SPRING } from '../stage/parts/util';
import { kick } from './kickoff';

const OPEN_MS = 980;
const SOFT_MS = 320;
const WAIT_VIDEO_MS = 500;
const RISE_GAP_MS = 80;

/* the real estimate: ceil(audio minutes x 1.25 + 2), never under 2 */
export const minutesOf = (sec: number): number => Math.max(2, Math.ceil((sec / 60) * 1.25 + 2));

const ready = (v: HTMLVideoElement): Promise<void> =>
  new Promise((done) => {
    if (v.readyState >= 2) return done();
    const t = window.setTimeout(done, WAIT_VIDEO_MS);
    v.addEventListener(
      'loadeddata',
      () => {
        window.clearTimeout(t);
        done();
      },
      { once: true }
    );
  });

/* the film opens out of her face on the card: her face's circle in the video sits over the card's face, then grows */
export async function openFrom(face: HTMLElement, frame: HTMLElement, show: () => void): Promise<void> {
  const h = kick.run().hello;
  const v = frame.querySelector<HTMLVideoElement>('.sf-video');
  if (!h || !v) return show();
  await ready(v);
  const vb = v.getBoundingClientRect();
  const fb = frame.getBoundingClientRect();
  const k = Math.max(vb.width / h.w, vb.height / h.h);
  const cx = vb.left - fb.left + (vb.width - h.w * k) / 2 + h.x * k;
  const cy = vb.top - fb.top + (vb.height - h.h * k) / 2 + h.y * k;
  const r = h.r * k;
  const t = face.getBoundingClientRect();
  const s = t.width / 2 / r;
  const dx = t.left + t.width / 2 - (fb.left + cx);
  const dy = t.top + t.height / 2 - (fb.top + cy);
  const far = Math.hypot(Math.max(cx, fb.width - cx), Math.max(cy, fb.height - cy));
  const origin = `${cx}px ${cy}px`;
  show();
  const a = frame.animate(
    [
      { clipPath: `circle(${r}px at ${cx}px ${cy}px)`, transform: `translate(${dx}px, ${dy}px) scale(${s})`, transformOrigin: origin },
      { clipPath: `circle(${r * 1.5}px at ${cx}px ${cy}px)`, transform: 'none', transformOrigin: origin, offset: 0.55 },
      { clipPath: `circle(${far}px at ${cx}px ${cy}px)`, transform: 'none', transformOrigin: origin },
    ],
    { duration: OPEN_MS, easing: SPRING }
  );
  await a.finished.catch(() => undefined);
}

export default function Join({ fromWalk, onJoin }: { fromWalk: boolean; onJoin: (face: HTMLElement | null) => void }) {
  const m = useFlow((s) => s.project?.manager);
  const card = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLSpanElement>(null);
  const going = useRef(false);
  const min = minutesOf(kick.total());

  useLayoutEffect(() => {
    const el = card.current;
    if (!el || prefersReduced(el)) return;
    const lines = [...el.querySelectorAll<HTMLElement>('[data-rise]')];
    const start = fromWalk ? 420 : 0;
    if (!fromWalk) rise(face.current, { y: 10, blur: 8, scale: 0.96 });
    lines.forEach((l, i) => rise(l, { y: 12, blur: 8, delay: start + i * RISE_GAP_MS }));
  }, [fromWalk]);

  const join = () => {
    if (going.current) return;
    going.current = true;
    const el = card.current;
    if (el && !prefersReduced(el)) {
      el.querySelectorAll<HTMLElement>('[data-rise]').forEach((l, i) =>
        l.animate([{ transform: 'none', filter: 'blur(0px)', opacity: 1 }, { transform: 'translateY(8px)', filter: 'blur(8px)', opacity: 0 }], {
          duration: SOFT_MS,
          delay: i * 30,
          easing: 'ease-in',
          fill: 'forwards',
        })
      );
    }
    onJoin(face.current);
  };

  return (
    <div className="jn" role="dialog" aria-label="Project kickoff">
      <div ref={card} className="jn-card">
        <h1 className="jn-t" data-rise="">
          Understand the scope and what comes next.
        </h1>
        <div className="jn-who" data-rise-root="">
          <span ref={face} className="jn-face">
            {m && <img src={m.face} alt="" draggable={false} />}
          </span>
          <span className="jn-name" data-rise="">
            <b>{m?.full}</b>
            <span>{m?.role}</span>
          </span>
        </div>
        <span className="jn-min" data-rise="">
          <Clock3 size={14} strokeWidth={1.75} />
          <span className="d1-num">~{min} min</span>
        </span>
        <button type="button" className="zj-key jn-go" data-rise="" onClick={join} autoFocus>
          Join Now
        </button>
      </div>
    </div>
  );
}
