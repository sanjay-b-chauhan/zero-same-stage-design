/* The fake desktop's state. Which app windows are open, which app is in front, where the PiP is headed.
   A stand-in for the Zero desktop app's real windows, so the flow can be felt in a browser. Nothing here is native.
   openDesktopApp is the one way in for the rest of the flow: a stage link calls it, the Dock calls it. */
import { create } from 'zustand';
import { useFlow } from '../../engine/store';

export type AppId = 'sheets' | 'claude';
export type ToolId = 'todos' | 'resources';
export type WinId = AppId | ToolId;
/* whose name is in the menu bar */
export type FrontApp = 'zero' | 'finder' | 'chrome' | AppId;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AppWin {
  open: boolean;
  min: boolean;
  z: number;
  n: number; /* every launch counts once, so a window opened again plays its arrival again */
}

/* a file Claude handed back, shown in Sheets beside what she shared */
export interface LooseFile {
  id: string;
  name: string;
  text: string;
}

export interface ClaudeMsg {
  id: string;
  from: 'me' | 'claude';
  text: string;
  list?: string[];
  file?: LooseFile;
}

interface Desk {
  wins: Record<AppId, AppWin>;
  toolZ: Record<ToolId, number>;
  front: FrontApp;
  running: Record<'chrome', boolean>;
  bounce: { app: string; n: number } | null;
  sheetFile?: string; /* the stage file or loose file Sheets shows, else the csv she shared */
  loose: LooseFile[];
  claude: ClaudeMsg[];
  thinking: boolean;
}

const closed = (): AppWin => ({ open: false, min: false, z: 0, n: 0 });

export const useDesk = create<Desk>(() => ({
  wins: { sheets: closed(), claude: closed() },
  toolZ: { todos: 0, resources: 0 },
  front: 'zero',
  running: { chrome: false },
  bounce: null,
  loose: [],
  claude: [],
  thinking: false,
}));

let zTop = 1;
let bounceN = 0;

/* Where things are, outside React: a window's frame survives the desktop going away and coming back,
   the PiP's resting rect is what tool windows open beside, the origin is where a window grows from. */
export const frames: Partial<Record<WinId, Rect>> = {};
export const origins: Partial<Record<WinId, Rect>> = {};
export const spot: { pip: Rect | null; back: Rect | null } = { pip: null, back: null };

/* true while the in-page desktop is on screen. The real window path never sets it */
export const desk = { on: false };

export const appOwner = (id: WinId): FrontApp => (id === 'todos' || id === 'resources' ? 'zero' : id);

export const setFront = (front: FrontApp) => {
  if (useDesk.getState().front !== front) useDesk.setState({ front });
};

export const focusWin = (id: WinId) => {
  const s = useDesk.getState();
  zTop += 1;
  if (id === 'todos' || id === 'resources') {
    useDesk.setState({ toolZ: { ...s.toolZ, [id]: zTop }, front: 'zero' });
    return;
  }
  useDesk.setState({ wins: { ...s.wins, [id]: { ...s.wins[id], z: zTop, min: false } }, front: id });
};

export const bounceDock = (app: string) => {
  bounceN += 1;
  useDesk.setState({ bounce: { app, n: bounceN } });
};

/* Opens an app on the desktop, or brings it to the front. From the big stage it leaves Zero first:
   opening a work app is going to work, and the PiP comes with you. `from` is where it grows out of. */
export function openDesktopApp(id: AppId, opts: { from?: Rect; fileId?: string } = {}): void {
  const flow = useFlow.getState();
  if (flow.ui.surface !== 'pip' && flow.screen === 'stage') flow.actions.setSurface('pip');
  if (opts.from) origins[id] = opts.from;
  const s = useDesk.getState();
  const was = s.wins[id];
  zTop += 1;
  const launching = !was.open;
  useDesk.setState({
    wins: { ...s.wins, [id]: { open: true, min: false, z: zTop, n: launching ? was.n + 1 : was.n } },
    front: id,
    ...(opts.fileId !== undefined && id === 'sheets' ? { sheetFile: opts.fileId } : {}),
  });
  if (launching) bounceDock(id);
}

export const closeDesktopApp = (id: AppId) => {
  const s = useDesk.getState();
  const rest = (Object.keys(s.wins) as AppId[]).filter((k) => k !== id && s.wins[k].open && !s.wins[k].min);
  /* the next window down takes the front, else the desktop is Finder's */
  const next = rest.sort((a, b) => s.wins[b].z - s.wins[a].z)[0];
  useDesk.setState({ wins: { ...s.wins, [id]: { ...s.wins[id], open: false, min: false } }, front: next ?? 'finder' });
};

export const minimizeDesktopApp = (id: AppId) => {
  const s = useDesk.getState();
  const rest = (Object.keys(s.wins) as AppId[]).filter((k) => k !== id && s.wins[k].open && !s.wins[k].min);
  const next = rest.sort((a, b) => s.wins[b].z - s.wins[a].z)[0];
  useDesk.setState({ wins: { ...s.wins, [id]: { ...s.wins[id], min: true } }, front: next ?? 'finder' });
};

export const showInSheets = (fileId: string) => openDesktopApp('sheets', { fileId });

export const addLoose = (f: LooseFile) => {
  const s = useDesk.getState();
  if (s.loose.some((x) => x.id === f.id)) return;
  useDesk.setState({ loose: [...s.loose, f] });
};
