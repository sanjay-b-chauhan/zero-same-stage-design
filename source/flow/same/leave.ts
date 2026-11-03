/* b30 (his note: "when we click it, we have this whole bigger white container that we have transitioned in. We'll also
   have a transition out. The same container goes there, sits on the first thing (a tick mark), goes to the second thing,
   and then we open up the second stage ... let's remove the black version"): Start's morph played backwards. The white
   chat sheet lets its words go soft, the objective comes up under it, and the sheet shrinks onto the row of the stage
   you just finished. The objective then plays its own way back (tick, marker down the path, next card) and opens the
   next stage with Start's morph. WAAPI only, no black screen. */
import { clock } from '../clock';
import { useFlow } from '../engine/store';
import { armAutoStart } from '../room/plan/returnSeq';

const SHRINK_MS = 640;
const SOFT_MS = 260;
const LET_GO_MS = 240;
const FIND_MS = 2500;
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const SHEET = '.d1-chat';
const ROW = '.ob-row';

let running = false;

const settled = (a: Animation, ms: number) => Promise.race([a.finished.then(() => undefined).catch(() => undefined), clock.wait(ms + 400)]);

const frame = (r: { left: number; top: number; width: number; height: number }, radius: number) => ({
  left: `${r.left}px`,
  top: `${r.top}px`,
  width: `${r.width}px`,
  height: `${r.height}px`,
  borderRadius: `${radius}px`,
});

/* the objective's row for the stage you finished, once the page has put it down */
const rowOf = (i: number): Promise<HTMLElement | null> =>
  new Promise((resolve) => {
    const t0 = performance.now();
    const look = () => {
      const row = document.querySelectorAll<HTMLElement>(ROW)[i];
      if (row && row.getBoundingClientRect().height > 0) return resolve(row);
      if (performance.now() - t0 > FIND_MS) return resolve(null);
      requestAnimationFrame(look);
    };
    look();
  });

export async function leaveStage(stageId: string): Promise<void> {
  if (running) return;
  running = true;
  try {
    const st = useFlow.getState();
    const stages = st.project?.stages ?? [];
    const at = Math.max(0, stages.findIndex((s) => s.id === stageId));
    const sheet = document.querySelector<HTMLElement>(SHEET);
    const quick = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const done = st.doneStages.includes(stageId) ? st.doneStages : [...st.doneStages, stageId];
    armAutoStart();
    if (!sheet || quick) {
      useFlow.setState({ doneStages: done });
      st.actions.goto('objective');
      return;
    }
    const from = sheet.getBoundingClientRect();
    const radius = parseFloat(getComputedStyle(sheet).borderTopLeftRadius) || 24;
    [...sheet.children].forEach((k) =>
      (k as HTMLElement).animate([{ filter: 'blur(0px)', opacity: 1 }, { filter: 'blur(8px)', opacity: 0 }], { duration: SOFT_MS, easing: 'ease-out', fill: 'forwards' })
    );
    await clock.wait(SOFT_MS - 60);

    const layer = document.createElement('div');
    layer.setAttribute('data-stage-leave', '');
    Object.assign(layer.style, {
      position: 'fixed',
      zIndex: '100000',
      ...frame(from, radius),
      background: getComputedStyle(sheet).backgroundColor || '#fff',
      boxShadow: '0 0 0 1px rgba(19,20,23,.05), 0 1px 2px rgba(19,20,23,.04), 0 24px 60px -24px rgba(10,37,64,.18)',
      pointerEvents: 'none',
      willChange: 'left, top, width, height',
    });
    document.body.appendChild(layer);

    useFlow.setState({ doneStages: done });
    st.actions.goto('objective');
    const row = await rowOf(at);
    if (row) {
      const to = row.getBoundingClientRect();
      const shrink = layer.animate([frame(from, radius), frame(to, 16)], { duration: SHRINK_MS, easing: EASE, fill: 'forwards' });
      await settled(shrink, SHRINK_MS);
    }
    const go = layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: LET_GO_MS, easing: 'linear', fill: 'forwards' });
    await settled(go, LET_GO_MS);
    layer.remove();
  } finally {
    running = false;
  }
}
