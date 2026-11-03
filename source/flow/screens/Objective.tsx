/* The real objective screen, default export of ObjectiveView, on our data. It stays light and it stays theirs.
   Start runs through the real onStageStart and the real stage route, so its spinner and lifecycle are the real ones. */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import ObjectiveView from '@/renderer/windows/newMainUI/pilotWebUI/components/ObjectiveView';
import { clock } from '../clock';
import { useFlow } from '../engine/store';
import { socketClient } from '../kickoff/harness';
import { fallbackProject, objectiveIdOf, seedObjective, seedStageStart, syncProgress } from './objectiveSeed';
import { playWhiteToBlack } from './WhiteToBlack';

const ROUTE_GUARD_MS = 400;
const PAGE_RISE_MS = 760;
const PAGE_EASE = 'cubic-bezier(.7,0,.2,1)';

let handedOff: string | null = null;

const handOff = (stageId: string) => {
  if (handedOff === stageId) return;
  handedOff = stageId;
  useFlow.getState().actions.startStage(stageId);
};

function StageRoute() {
  const { stageId } = useParams<{ stageId: string }>();
  useEffect(() => {
    if (stageId) handOff(stageId);
  }, [stageId]);
  return null;
}

function HomeRoute() {
  useEffect(() => {
    useFlow.getState().actions.goto('objective');
  }, []);
  return null;
}

const sendNpcFlowMessage = () => {};

export default function Objective() {
  const project = useFlow((s) => s.project) ?? fallbackProject();
  const stage = useFlow((s) => s.stage);
  const doneStages = useFlow((s) => s.doneStages);
  const qc = useQueryClient();
  const page = useRef<HTMLDivElement>(null);

  const onStageStart = useCallback(
    async (s: { id: string | number }) => {
      const id = String(s.id);
      handedOff = null;
      await playWhiteToBlack();
      seedStageStart(id, qc);
      /* the real path navigates next, and the route starts the stage. If it ever stalls, black must not hold. */
      clock.setTimeout(() => handOff(id), ROUTE_GUARD_MS);
    },
    [qc]
  );

  useMemo(() => seedObjective(project, stage, doneStages, qc), [project.id]);

  useEffect(() => {
    syncProgress(project, stage, doneStages);
  }, [project, stage?.stageId, doneStages]);

  /* the page rises over the paper, the same move and numbers as b23's plan page */
  useEffect(() => {
    const el = page.current;
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const a = el.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], {
      duration: PAGE_RISE_MS,
      easing: PAGE_EASE,
    });
    return () => a.cancel();
  }, []);

  const oid = objectiveIdOf(project);
  return (
    <div
      className="font-google-sans-flex"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#f2f0ed',
        color: 'var(--foreground)',
        fontSize: 16,
        lineHeight: 1.5,
        letterSpacing: 'normal',
      }}
    >
      <div ref={page} id="main" className="size-full font-google-sans-flex relative overflow-hidden">
        <MemoryRouter initialEntries={[`/objective/${oid}`]}>
          <Routes>
            <Route
              path="/objective/:id"
              element={
                <div className="h-screen">
                  <ObjectiveView
                    sendNpcFlowMessage={sendNpcFlowMessage}
                    socketClient={socketClient}
                    onStageStart={onStageStart}
                  />
                </div>
              }
            />
            <Route path="/objective/:id/stage/:stageId" element={<StageRoute />} />
            <Route path="*" element={<HomeRoute />} />
          </Routes>
        </MemoryRouter>
      </div>
    </div>
  );
}
