/* Press and drag a sheet to move it, like grabbing a canvas. It follows the pointer 1:1 from where you grabbed it and glides
   a little when you let go. Nothing happens for the first 6 px, so a click still lands on its cell and a double click still
   selects. The wheel and the trackpad scroll it as they always did. Mouse and pen only: a finger already scrolls it. */
import { useEffect, type RefObject } from 'react';
import { prefersReduced } from './util';

const START_PX = 6;
const VELOCITY_WINDOW_MS = 80;
const FRICTION = 0.94; /* per 16 ms frame */
const STOP_PX_PER_MS = 0.02;
const FRAME_MS = 16;

export function useGrabPan(ref: RefObject<HTMLElement | null>, on = true): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || !on) return;
    const view = el.ownerDocument.defaultView ?? window;
    let glide = 0;
    const stop = () => {
      if (glide) view.cancelAnimationFrame(glide);
      glide = 0;
    };

    const down = (e: PointerEvent) => {
      if (e.button !== 0 || e.pointerType === 'touch') return;
      stop();
      const sx = e.clientX;
      const sy = e.clientY;
      const left = el.scrollLeft;
      const top = el.scrollTop;
      const trail: Array<{ t: number; x: number; y: number }> = [];
      let panning = false;

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - sx;
        const dy = ev.clientY - sy;
        if (!panning) {
          if (Math.hypot(dx, dy) < START_PX) return;
          panning = true;
          try {
            el.setPointerCapture(ev.pointerId);
          } catch {
            /* it still follows while the pointer stays over it */
          }
          el.dataset.panning = 'true';
          el.ownerDocument.getSelection()?.removeAllRanges();
        }
        ev.preventDefault();
        el.scrollLeft = left - dx;
        el.scrollTop = top - dy;
        trail.push({ t: ev.timeStamp, x: ev.clientX, y: ev.clientY });
        while (trail.length > 2 && ev.timeStamp - trail[0].t > VELOCITY_WINDOW_MS) trail.shift();
      };

      const up = (ev: PointerEvent) => {
        view.removeEventListener('pointermove', move);
        view.removeEventListener('pointerup', up);
        view.removeEventListener('pointercancel', up);
        if (!panning) return;
        delete el.dataset.panning;
        try {
          el.releasePointerCapture(ev.pointerId);
        } catch {
          /* already released */
        }
        /* the drag was a drag: the click it ends with presses nothing */
        const eat = (c: MouseEvent) => {
          c.stopPropagation();
          c.preventDefault();
        };
        el.addEventListener('click', eat, { capture: true, once: true });
        view.setTimeout(() => el.removeEventListener('click', eat, { capture: true }), 0);

        const a = trail[0];
        const b = trail[trail.length - 1];
        const dt = a && b ? b.t - a.t : 0;
        if (ev.type === 'pointercancel' || dt <= 0 || prefersReduced(el)) return;
        let vx = (b.x - a.x) / dt;
        let vy = (b.y - a.y) / dt;
        let last = performance.now();
        const step = (now: number) => {
          const ms = Math.min(48, now - last);
          last = now;
          el.scrollLeft -= vx * ms;
          el.scrollTop -= vy * ms;
          const k = Math.pow(FRICTION, ms / FRAME_MS);
          vx *= k;
          vy *= k;
          glide = Math.hypot(vx, vy) > STOP_PX_PER_MS ? view.requestAnimationFrame(step) : 0;
        };
        glide = view.requestAnimationFrame(step);
      };

      /* on the window: before capture starts the pointer can leave the sheet, and the page still hears it */
      view.addEventListener('pointermove', move);
      view.addEventListener('pointerup', up);
      view.addEventListener('pointercancel', up);
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('wheel', stop, { passive: true });
    return () => {
      stop();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('wheel', stop);
      delete el.dataset.panning;
    };
  }, [ref, on]);
}
