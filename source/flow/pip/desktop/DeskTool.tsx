/* To-dos or resources as a floating panel on the fake desktop, the in-page twin of ToolWindow.tsx.
   It opens out of the PiP, beside it, and closes back into it. Same parts as the PiP, same store.
   A sheet opens in Sheets and a Claude link opens Claude, the way a file opens in its real app. Anything else shows right here. */
import { useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useFlow } from '../../engine/store';
import Preview from '../../stage/parts/Preview';
import ResourcesList from '../../stage/parts/ResourcesList';
import { rise } from '../../stage/parts/util';
import PipSlots from '../PipSlots';
import { setTool, useTools, type Tool } from '../toolStore';
import { focusWin, frames, openDesktopApp, spot, useDesk } from './deskStore';
import { toolFrame } from './geometry';
import MacWindow from './MacWindow';

const TITLE: Record<Tool, string> = { todos: 'Slots', resources: 'Resources' };
const W = 320;
const VIEW_W = 520;
const FIRST_H = 240;
const OTHER: Record<Tool, Tool> = { todos: 'resources', resources: 'todos' };
/* b16: how small and how big each page of a panel can be pulled */
const LIST_LIMITS = { min: { w: 260, h: 140 }, max: { w: 560, h: 760 } };
const VIEW_LIMITS = { min: { w: 400, h: 300 }, max: { w: 960, h: 860 } };

function Body({ tool, viewing, setViewing }: { tool: Tool; viewing: boolean; setViewing: (v: boolean) => void }) {
  const light = useFlow((s) => s.ui.lightStage);
  const inner = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    rise(inner.current, { y: 8, blur: 6, ms: 480 });
  }, [viewing]);

  /* View: a sheet goes to Sheets, a Claude link to Claude, the rest opens here.
     Handed to its app, the panel has done its job and goes back into the PiP, out of the app's way */
  const handOff = (app: 'sheets' | 'claude', fileId?: string) => {
    openDesktopApp(app, { fileId, from: spot.pip ?? undefined });
    setTool(tool, false);
  };
  const view = (id: string) => {
    const f = useFlow.getState().stage?.files.find((x) => x.id === id);
    if (f?.kind === 'csv') return handOff('sheets', id);
    if (f?.kind === 'link' && /claude\.ai/i.test(f.url ?? '')) return handOff('claude');
    useFlow.setState((s) => ({ ui: { ...s.ui, previewFileId: id } }));
    setViewing(true);
  };

  return (
    <div className={`zp zp-tool zmac-tool z-root zj zs2 ${light ? 'z-light' : 'zd'}`} data-tool={tool}>
      <div ref={inner} className="zp-tool-in" key={viewing ? 'view' : 'list'}>
        {viewing ? (
          <Preview surface="pip" onClose={() => setViewing(false)} />
        ) : tool === 'todos' ? (
          <div className="zp-scroll">
            <PipSlots />
          </div>
        ) : (
          <ResourcesList surface="pip" onView={view} />
        )}
      </div>
      {viewing && (
        <button type="button" className="zp-tool-x zs2-ghost" aria-label="Back to the list" onClick={() => setViewing(false)}>
          <X size={16} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

export default function DeskTool({ tool }: { tool: Tool }) {
  const open = useTools((t) => t[tool]);
  const z = useDesk((d) => d.toolZ[tool]);
  const front = useDesk((d) => d.front);
  const top = useDesk((d) => (d.toolZ.todos >= d.toolZ.resources ? 'todos' : 'resources'));
  const [viewing, setViewing] = useState(false);

  /* every time it opens, it opens beside the PiP, wherever the PiP is now */
  if (!open) delete frames[tool];

  return (
    <MacWindow
      id={tool}
      open={open}
      z={z}
      active={front === 'zero' && top === tool}
      title={TITLE[tool]}
      tone="zero"
      panel
      width={viewing ? VIEW_W : W}
      limits={viewing ? VIEW_LIMITS : LIST_LIMITS}
      from={() => spot.pip}
      frame={(h) => toolFrame(spot.pip, viewing ? VIEW_W : W, h || FIRST_H, useTools.getState()[OTHER[tool]] ? 1 : 0, window.innerWidth, window.innerHeight)}
      onFocus={() => focusWin(tool)}
      onClose={() => {
        setViewing(false);
        setTool(tool, false);
      }}
    >
      <Body tool={tool} viewing={viewing} setViewing={setViewing} />
    </MacWindow>
  );
}
