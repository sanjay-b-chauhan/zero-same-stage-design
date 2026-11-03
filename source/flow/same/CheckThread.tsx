/* b36 (his note: "when user sent the voice note, remove the transcript and add there Eryn is listening thing and then
   manager bubble and remove the waveform thing and add just the text and remove the 3s 2s 1s thing and dot dot as well,
   just the shimmer works" and "that should be only one voice note, not two"): the stage check-in reads like the chat
   around it. Your answer is a plain bubble, her name shimmers while she listens, her reply is one bubble whose words
   arrive on her voice */
import { useLayoutEffect, useRef } from 'react';
import { useFlow } from '../engine/store';
import { useHoldUi } from '../room/hold';
import { usePou } from '../room/pou';
import { rise } from '../stage/parts/util';
import { groupBySpeaker, shownWords, type CheckGroup } from './checkGroups';

function Bubble({ g }: { g: CheckGroup }) {
  const row = useRef<HTMLDivElement>(null);
  const stream = usePou((s) => s.stream);
  useLayoutEffect(() => {
    rise(row.current, { y: 10, blur: 6, ms: 560 });
  }, []);
  const text = g.msgs
    .map((m) => shownWords(m, stream))
    .filter(Boolean)
    .join(' ');
  return (
    <div ref={row} className={`d1-row ${g.from === 'her' ? 'd1-row-her' : 'd1-row-me'}`}>
      <div className={g.from === 'her' ? 'd1-bub' : 'd1-bub d1-me'}>{text}</div>
    </div>
  );
}

export function CheckThread() {
  const thread = usePou((s) => s.thread);
  const ended = usePou((s) => s.ended);
  const sending = useHoldUi((s) => s.sending);
  const name = useFlow((s) => s.project?.manager?.name ?? 'She');
  const last = thread[thread.length - 1];
  const listening = !ended && (sending || last?.from === 'me');
  return (
    <div className="ds-ck">
      {groupBySpeaker(thread).map((g) => (
        <Bubble key={g.key} g={g} />
      ))}
      {listening && (
        <div className="d1-row d1-row-me ds-ck-lsn" aria-live="polite">
          <span className="ds-ck-lsn-t">{name} is listening</span>
        </div>
      )}
    </div>
  );
}
