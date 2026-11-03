/* Under the bar: one body, then the action area. It only exists while you look at something.
   Chat is the shared thread with her quiet lines placed above her answers. Slots are compact. Everything rises after the window snaps. */
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useFlow } from '../engine/store';
import Composer from '../stage/parts/Composer';
import FeedbackList from '../stage/parts/FeedbackList';
import FilmPlayer from '../stage/parts/FilmPlayer';
import Preview from '../stage/parts/Preview';
import ResourcesList from '../stage/parts/ResourcesList';
import SubmitArea from '../stage/parts/SubmitArea';
import Thread from '../stage/parts/Thread';
import { rise } from '../stage/parts/util';
import { hasComposer, shownBody, workDone, type ShownBody } from './logic';
import PipPou from './PipPou';
import PipSlots from './PipSlots';
import SeenLayer from './SeenLayer';
import { useWholeRows } from './useWholeRows';

const AFTER_SNAP_MS = 70; /* the OS resize has no animation. The body waits for it, then rises. */

function ActionArea({ shown }: { shown: ShownBody }) {
  const phase = useFlow((s) => s.stage?.phase ?? 'work');
  const done = useFlow((s) => workDone(s.stage));
  if (shown !== 'chat' && shown !== 'slots' && shown !== 'feedback') return null;
  if (hasComposer(shown, phase, done)) {
    return (
      <div className="zp-action">
        <Composer surface="pip" />
      </div>
    );
  }
  if (phase === 'pou') return null;
  return (
    <div className="zp-action">
      <SubmitArea surface="pip" part="key" />
    </div>
  );
}

export default function PipBody({ real, onClosePreview }: { real: boolean; onClosePreview: () => void }) {
  const body = useFlow((s) => s.ui.pipBody);
  const phase = useFlow((s) => s.stage?.phase ?? 'work');
  const submitOpen = useFlow((s) => s.stage?.submitOpen ?? false);
  const unread = useFlow((s) => s.stage?.unread ?? false);
  const filmId = useFlow((s) => {
    if (s.ui.filmId) return s.ui.filmId;
    const msgs = s.stage?.msgs ?? [];
    for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].film) return msgs[i].film?.id;
    return undefined;
  });
  const markRead = useFlow((s) => s.actions.markRead);
  const shown = shownBody(body, phase, submitOpen);

  const el = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    rise(el.current, { y: 10, blur: 6, ms: 520, delay: first.current && real ? AFTER_SNAP_MS : 0 });
    first.current = false;
  }, [shown, real]);

  useEffect(() => {
    if ((shown === 'chat' || shown === 'pou') && unread) markRead();
  }, [shown, unread, markRead]);

  useWholeRows(el, shown === 'chat');

  return (
    <>
      <div ref={el} key={shown} className="zp-body" data-body={shown}>
        {shown === 'chat' && (
          <>
            <Thread surface="pip" />
            <SeenLayer host={el} />
          </>
        )}
        {shown === 'slots' && (
          <div className="zp-scroll">
            <PipSlots />
          </div>
        )}
        {shown === 'resources' && <ResourcesList surface="pip" />}
        {shown === 'preview' && <Preview surface="pip" onClose={onClosePreview} />}
        {shown === 'film' && filmId && <FilmPlayer surface="pip" filmId={filmId} />}
        {shown === 'feedback' && (
          <div className="zp-scroll">
            <FeedbackList surface="pip" />
          </div>
        )}
        {shown === 'submit' && <SubmitArea surface="pip" part="drop" />}
        {shown === 'pou' && <PipPou />}
      </div>
      <ActionArea shown={shown} />
      {real && <span className="zp-stamp">b23</span>}
    </>
  );
}
