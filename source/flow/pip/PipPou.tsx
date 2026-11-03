/* The stage POU in the small window. The same exchange as the big screen, adapted: her question is the same voice note,
   her face is the same circle on the same voice, you hold to talk and your line appears. The row's dashes are the lines.
   b14: talking needs nothing from the browser now (pip/talk.ts), so the hold is always here, and your words show as you say them */
import { useLayoutEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
import { useFlow } from '../engine/store';
import CoachCard from '../stage/parts/CoachCard';
import { HeldClock } from '../stage/parts/Composer';
import { useDraft } from '../stage/parts/draft';
import Heard from '../stage/parts/Heard';
import MicBars from '../stage/parts/MicBars';
import { holdProps } from '../stage/parts/useHold';
import { rise } from '../stage/parts/util';
import VoicePill from '../stage/parts/VoicePill';
import { lastFromMe, openNote } from './logic';

const ICON = { size: 16, strokeWidth: 1.75 };

function HoldSlab() {
  const listening = useFlow((s) => s.ui.listening);
  const typing = useFlow((s) => s.stage?.typing ?? false);
  const repeat = useDraft((s) => s.repeat);
  return (
    <button type="button" className="zp-hold" data-rec={listening || undefined} data-off={typing || undefined} {...holdProps()}>
      <Mic {...ICON} />
      {listening ? (
        <>
          <Heard className="zp-hold-heard" />
          <MicBars bars={10} />
          <HeldClock />
        </>
      ) : (
        <span>{repeat ? 'Say that again. Hold Space' : 'Hold Space to talk'}</span>
      )}
    </button>
  );
}

export default function PipPou() {
  const msgs = useFlow((s) => s.stage?.msgs);
  const typing = useFlow((s) => s.stage?.typing ?? false);
  const q = openNote(msgs);
  /* only what you said out loud. A link you pasted before the POU is not your answer. */
  const last = lastFromMe(msgs);
  const mine = last?.voiced ? last : undefined;
  const line = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    rise(line.current, { y: 8, blur: 4, ms: 480 });
  }, [mine?.id]);
  const note = useRef<HTMLDivElement>(null);
  const firstNote = useRef(true);
  useLayoutEffect(() => {
    if (!firstNote.current && q) rise(note.current, { y: 10, blur: 6, ms: 480 });
    firstNote.current = false;
  }, [q?.id]);

  return (
    <div className="zp-pou">
      <div className="zp-pou-mid">
        {mine?.text && (
          <p ref={line} className="zp-pou-mine">
            {mine.text}
          </p>
        )}
        {q?.voice && (
          <div key={q.id} ref={note} className="zp-pou-note">
            <VoicePill id={q.id} surface="pip" url={q.voice.url} dur={q.voice.dur} text={q.voice.text} />
          </div>
        )}
        {typing && (
          <div className="zs2-typing" data-alone={!q || undefined} aria-label="Writing">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
      <CoachCard surface="pip" />
      <HoldSlab />
    </div>
  );
}
