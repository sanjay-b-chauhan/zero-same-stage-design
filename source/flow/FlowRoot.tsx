/* The whole flow, in one page, so a PiP window can live through the stage.
   world > card > brief is Opening. kickoff, pou, breakdown, objective are one Room: same DOM, the mode changes.
   Stage is the dark room. */
import Opening from './open/Opening';
import Room from './room/Room';
import Stage from './stage/Stage';
import StageD1 from './d1/StageD1';
import StageSame from './same/StageSame';
import StageTurn from './stage/parts/StageTurn';
import { useFlow } from './engine/store';
import { isRoomScreen } from './types';
import { Hud } from './hud';

export default function FlowRoot() {
  const screen = useFlow((s) => s.screen);
  return (
    <div className="z-root zj" style={{ position: 'fixed', inset: 0, background: 'transparent' }}>
      {screen === 'world' && <Opening />}
      {isRoomScreen(screen) && <Room />}
      {screen === 'stage' && (import.meta.env.VITE_DS === '2' ? <StageSame /> : import.meta.env.VITE_D1 === '1' ? <StageD1 /> : <Stage />)}
      <div className={isRoomScreen(screen) ? 'b-light' : undefined} style={{ display: 'contents' }}>
        <Hud />
      </div>
      <StageTurn />
      <span className="z-stamp">{import.meta.env.VITE_DS === '2' ? 'ds b29' : import.meta.env.VITE_DS === '1' ? 'ds b1' : import.meta.env.VITE_D1 === '1' ? 'd1 b1' : 'b23'}</span>
    </div>
  );
}
