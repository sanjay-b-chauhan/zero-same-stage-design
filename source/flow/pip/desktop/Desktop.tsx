/* The page as a believable macOS desktop while you are out of Zero, working in your tools. A stand-in for the Zero desktop
   app's real PiP, to feel it in a browser. Mounted by PipRoot on the in-page path, so it lives exactly as long as the PiP.
   Layers, bottom to top: the wallpaper, app windows, Zero's tool panels, the Dock, the menu bar, her cursor when she points,
   Zero leaving or arriving, the PiP. The PiP stays above everything. Arriving, the stage shrinks into the PiP and the desktop rises around it;
   leaving, Zero grows back out of the PiP (or its Dock icon) and the desktop sinks away under it. */
import './desktop.css';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import ClaudeApp from './ClaudeApp';
import { closeDesktopApp, desk, focusWin, minimizeDesktopApp, origins, setFront, spot, useDesk, type AppId } from './deskStore';
import DeskTool from './DeskTool';
import { cancelReturn, playLeave, playReturn } from './handoff';
import MacDock, { iconRect } from './MacDock';
import MacWindow from './MacWindow';
import MenuBar from './MenuBar';
import Pointer from './Pointer';
import SheetsApp, { useSheetTitle } from './SheetsApp';

const LEAVE_PIP_DELAY_MS = 360;
export const PIP_ENTER_DELAY_MS = LEAVE_PIP_DELAY_MS;

const TITLES: Record<AppId, (sheet: string) => string> = {
  sheets: (name) => `${name} - Google Sheets`,
  claude: () => 'Claude',
};

/* where an app window grows from: the icon you pressed or the PiP once, then its own Dock icon */
const fromFor = (id: AppId) => () => {
  const once = origins[id];
  if (once) {
    delete origins[id];
    return once;
  }
  return iconRect(id);
};

function AppWin({ id }: { id: AppId }) {
  const w = useDesk((d) => d.wins[id]);
  const active = useDesk((d) => d.front === id);
  const sheetName = useSheetTitle();
  const from = useRef(fromFor(id)).current;
  return (
    <MacWindow
      id={id}
      open={w.open}
      min={w.min}
      n={w.n}
      z={w.z}
      active={active}
      title={TITLES[id](sheetName)}
      tone={id === 'claude' ? 'claude' : 'light'}
      from={from}
      onFocus={() => focusWin(id)}
      onClose={() => closeDesktopApp(id)}
      onMin={() => minimizeDesktopApp(id)}
    >
      {id === 'sheets' ? <SheetsApp active={active} /> : <ClaudeApp />}
    </MacWindow>
  );
}

export default function Desktop({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  /* Arriving and leaving. The PiP has placed itself by now (children lay out first), so its rect is where Zero shrinks into.
     Coming back runs as this unmounts, from where the PiP is, or the Dock icon that was pressed */
  useLayoutEffect(() => {
    const layer = root.current;
    desk.on = true;
    cancelReturn();
    if (layer && spot.pip) playLeave(layer, spot.pip);
    return () => {
      desk.on = false;
      if (!layer) return;
      const pip = layer.querySelector('.zp-dock')?.getBoundingClientRect();
      const from = spot.back ?? (pip && pip.width ? { x: pip.left, y: pip.top, w: pip.width, h: pip.height } : spot.pip);
      spot.back = null;
      playReturn(layer, from);
    };
  }, []);

  return (
    <div ref={root} className="zmac">
      <div className="zmac-wall" onPointerDown={() => setFront('finder')} />
      <div className="zmac-wins">
        <AppWin id="sheets" />
        <AppWin id="claude" />
      </div>
      <div className="zmac-tools">
        <DeskTool tool="todos" />
        <DeskTool tool="resources" />
      </div>
      <MacDock />
      <MenuBar />
      <Pointer />
      <div className="zmac-ghost-slot" />
      {children}
    </div>
  );
}
