/* The quiet line above her answer: what she looked at, read or checked before she said it.
   "Viewed screen" holds the frame she saw: hover or focus it and the frame shows (Pops draws it). */
import { Fragment, useLayoutEffect } from 'react';
import type { Frame, SeenItem } from './seen';

/* the frames on screen right now, by the answer they sit above */
export const frameRegistry = new Map<string, Frame>();
/* b23 (his note: "in the full-screen chat, when I hover over the screen, no pop-up comes up"): the PiP and the full screen
   both draw the same answer. Leaving the PiP unmounted its copy last and took the frame with it, so each id counts its users */
const users = new Map<string, number>();

export default function SeenLine({ id, items }: { id: string; items: SeenItem[] }) {
  const frame = items.find((x) => x.frame)?.frame;
  useLayoutEffect(() => {
    if (!frame) return;
    frameRegistry.set(id, frame);
    users.set(id, (users.get(id) ?? 0) + 1);
    return () => {
      const left = (users.get(id) ?? 1) - 1;
      if (left > 0) return void users.set(id, left);
      users.delete(id);
      frameRegistry.delete(id);
    };
  }, [id, frame]);

  return (
    <div className="zp-seen" data-seen={items.map((x) => x.key).join(' ')}>
      {items.map((it, i) => (
        <Fragment key={it.key}>
          {i > 0 && <span className="zp-seen-sep" aria-hidden />}
          {it.frame ? (
            <button type="button" className="zp-seen-item" data-frame={id} aria-label={`${it.label}. Show the frame she saw`}>
              {it.label}
            </button>
          ) : (
            <span className="zp-seen-item">{it.label}</span>
          )}
        </Fragment>
      ))}
    </div>
  );
}
