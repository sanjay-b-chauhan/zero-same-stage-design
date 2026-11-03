/* What the middle of the bar holds right now. One place, one thing.
   Your voice first (your words as she hears them), then the frame she took, then her answer as she says it while the chat is
   not what you are looking at, then a slot landing (its name holds 2 s, the reward), the coach stepping in, then the one next
   action while the bar is all there is, else her name. Anything that can stick times back to her name. */
import { useEffect, useRef, useState } from 'react';
import { clock } from '../clock';
import { useFlow } from '../engine/store';
import { nextStageLabel } from '../stage/parts/SubmitArea';
import { fixesLabel, shownBody, submitLabel, workDone } from './logic';
import { useTalk } from './talk';

export type BarAct = 'submit' | 'resubmit' | 'pou' | 'next' | 'project' | 'fixes';

export type Zone =
  | { kind: 'listen'; key: 'listen' }
  | { kind: 'look'; key: 'look' }
  | { kind: 'say'; key: 'say' }
  | { kind: 'land'; key: string; label: string; verified: boolean }
  | { kind: 'coach'; key: 'coach'; name: string; face: string }
  | { kind: 'act'; key: string; label: string; full: string; act: BarAct }
  | { kind: 'who'; key: 'who' };

const FILL_MS = 2000;
const COACH_MS = 6000;

export function useZone(open: boolean): Zone {
  const listening = useFlow((s) => s.ui.listening);
  const talking = useTalk((s) => s.phase === 'listening');
  const looking = useTalk((s) => s.phase === 'looking' && !!s.frame);
  const answering = useTalk((s) => s.phase === 'answering');
  const landedAt = useFlow((s) => s.stage?.lastSlotAt ?? 0);
  const landedLabel = useFlow((s) => s.stage?.steps.flatMap((x) => x.slots).find((x) => x.id === s.stage?.lastSlotId)?.label);
  const landedOk = useFlow((s) => !!s.stage?.steps.flatMap((x) => x.slots).find((x) => x.id === s.stage?.lastSlotId)?.verified);
  const phase = useFlow((s) => s.stage?.phase ?? 'work');
  const submitOpen = useFlow((s) => s.stage?.submitOpen ?? false);
  const done = useFlow((s) => workDone(s.stage));
  const fixes = useFlow((s) => (s.stage?.feedback ?? []).filter((f) => !f.checked).length);
  const deliverable = useFlow((s) => s.project?.stages.find((x) => x.id === s.stage?.stageId)?.deliverable.label);
  const nextLabel = useFlow((s) => {
    const list = s.project?.stages ?? [];
    const i = list.findIndex((x) => x.id === s.stage?.stageId);
    return i >= 0 && list[i + 1] ? nextStageLabel(i, list.length) : null;
  });
  const coach = useFlow((s) => s.stage?.coach);
  const pipBody = useFlow((s) => s.ui.pipBody);
  const cardHere = open && shownBody(pipBody, phase, submitOpen) === 'pou';

  const [landing, setLanding] = useState(false);
  const landSeen = useRef(landedAt);
  useEffect(() => {
    if (!landedAt || landedAt === landSeen.current) return;
    landSeen.current = landedAt;
    setLanding(true);
    const id = clock.setTimeout(() => setLanding(false), FILL_MS);
    return () => clock.clearTimeout(id);
  }, [landedAt]);

  const [coachHolds, setCoachHolds] = useState(false);
  useEffect(() => {
    setCoachHolds(!!coach);
    if (!coach) return;
    const id = clock.setTimeout(() => setCoachHolds(false), COACH_MS);
    return () => clock.clearTimeout(id);
  }, [coach]);

  if (listening || talking) return { kind: 'listen', key: 'listen' };
  if (looking) return { kind: 'look', key: 'look' };
  /* her answer is in the chat when the chat is open, so the bar only carries it when it is not */
  if (answering && !(open && pipBody === 'chat')) return { kind: 'say', key: 'say' };
  if (landing && landedLabel) return { kind: 'land', key: `land-${landedAt}`, label: landedLabel, verified: landedOk };
  if (coach && coachHolds && !cardHere) return { kind: 'coach', key: 'coach', name: coach.name, face: coach.face };
  /* opened, the body holds the key. The bar only announces while it is the whole window */
  if (!open) {
    if (phase === 'work' && done && !submitOpen) {
      const full = submitLabel(deliverable);
      return { kind: 'act', key: 'act-submit', label: 'Submit', full, act: 'submit' };
    }
    if (phase === 'feedback' && !submitOpen) {
      return fixes > 0
        ? { kind: 'act', key: 'act-fixes', label: fixesLabel(fixes), full: 'Tick off each fix', act: 'fixes' }
        : { kind: 'act', key: 'act-resubmit', label: 'Resubmit', full: 'Fix and resubmit', act: 'resubmit' };
    }
    if (phase === 'approved') return { kind: 'act', key: 'act-pou', label: 'Start POU', full: 'Start POU', act: 'pou' };
    if (phase === 'done') {
      return nextLabel
        ? { kind: 'act', key: 'act-next', label: 'Next stage', full: nextLabel, act: 'next' }
        : { kind: 'act', key: 'act-project', label: 'Project', full: 'Back to the project', act: 'project' };
    }
  }
  return { kind: 'who', key: 'who' };
}
