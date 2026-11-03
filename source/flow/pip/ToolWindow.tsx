/* One tool in its own window beside the PiP: the to-dos, or the resources as plain rows. Same store, same parts.
   The window is as tall as what it holds and follows it as rows land. View on a file shows it right here, wider. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFlow } from '../engine/store';
import Preview from '../stage/parts/Preview';
import ResourcesList from '../stage/parts/ResourcesList';
import { rise } from '../stage/parts/util';
import { naturalH } from './natural';
import PipSlots from './PipSlots';
import { setTool, type Tool } from './toolStore';
import { closeToolWin, fitToolWin, TOOL_W, toolWin } from './toolWindows';
import { dressWindow } from './usePipWindow';

const TITLE: Record<Tool, string> = { todos: 'Slots', resources: 'Resources' };
const MIN_H = 96;
const MAX_H = 560;
const VIEW = { w: 520, h: 600 };
const CLOSED_POLL_MS = 500;

function Body({ tool, win }: { tool: Tool; win: Window }) {
  const light = useFlow((s) => s.ui.lightStage);
  const [viewing, setViewing] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  /* View: the file opens here, the window grows to show it, Close puts the list back */
  const view = (id: string) => {
    useFlow.setState((s) => ({ ui: { ...s.ui, previewFileId: id } }));
    setViewing(true);
  };

  useLayoutEffect(() => {
    rise(inner.current, { y: 8, blur: 6, ms: 480 });
  }, [viewing]);

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const fit = () => {
      if (viewing) return fitToolWin(win, VIEW);
      const box = el.querySelector<HTMLElement>(tool === 'todos' ? '.zp-scroll' : '.zs2-res');
      const h = box ? naturalH(box) : MIN_H;
      fitToolWin(win, { w: TOOL_W, h: Math.min(MAX_H, Math.max(MIN_H, h)) });
    };
    fit();
    const Obs = (win as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver ?? ResizeObserver;
    const ro = new Obs(() => fit());
    const watch = el.querySelector(tool === 'todos' ? '.zp-slots' : '.zs2-res');
    if (watch) ro.observe(watch);
    return () => ro.disconnect();
  }, [tool, win, viewing]);

  return (
    <div ref={root} className={`zp zp-tool z-root zj zs2 ${light ? 'z-light' : 'zd'}`} data-tool={tool}>
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

export default function ToolWindow({ tool }: { tool: Tool }) {
  const [host, setHost] = useState<{ win: Window; mount: HTMLElement } | null>(null);

  useEffect(() => {
    const win = toolWin(tool);
    if (!win) {
      setTool(tool, false);
      return;
    }
    let gone = false;
    const dressed = dressWindow(win, TITLE[tool]);
    /* closed by its own X: the key in the PiP goes back to off */
    const shut = () => {
      if (gone) return;
      gone = true;
      setTool(tool, false);
    };
    win.addEventListener('pagehide', shut);
    const poll = window.setInterval(() => {
      if (win.closed) shut();
    }, CLOSED_POLL_MS);
    void dressed.loaded.then(() => {
      if (!gone && !win.closed) setHost({ win, mount: dressed.mount });
    });
    return () => {
      gone = true;
      window.clearInterval(poll);
      try {
        win.removeEventListener('pagehide', shut);
      } catch {
        /* the window is gone */
      }
      dressed.undress();
      closeToolWin(tool);
    };
  }, [tool]);

  return host ? createPortal(<Body tool={tool} win={host.win} />, host.mount) : null;
}
