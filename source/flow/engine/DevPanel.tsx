/* Control+D. Jump to any state and hand in a real generated file. Hidden otherwise, so it never reads as product UI. */
import { useEffect, useState } from 'react';
import { useFlow } from './store';
import type { EngineDev } from './stage';

const engine = () => (window as unknown as { __engine?: EngineDev | null }).__engine;

const ROOMS = ['world', 'kickoff', 'pou', 'breakdown', 'objective'];
const JUMPS = ['stage', 'issues-3', 'prompt', 'submit', 'feedback', 'approved', 'stage-pou', 'done'];

const CSS = `
.zdev{position:fixed;left:16px;bottom:16px;z-index:9999;width:216px;padding:10px;display:grid;gap:8px;
  background:var(--z-panel,#1c1a18);border:1px solid var(--z-line,#3a3733);border-radius:10px;
  color:var(--z-tx,#f2f0ed);font:12px/16px var(--z-sans,system-ui,sans-serif)}
.zdev-row{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.zdev button{height:28px;padding:0 8px;text-align:left;background:var(--z-raise,#26231f);color:inherit;font:inherit;
  border:1px solid var(--z-line,#3a3733);border-radius:6px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.zdev button:hover{border-color:var(--z-tx-2,#a8a39b)}
.zdev button:active{transform:translateY(1px)}
.zdev button:focus-visible{outline:2px solid var(--z-tx,#f2f0ed);outline-offset:1px}
.zdev button[aria-pressed="true"]{border-color:var(--z-tx,#f2f0ed)}
`;

export default function DevPanel() {
  const [open, setOpen] = useState(false);
  const project = useFlow((s) => s.project?.id);
  const jump = useFlow((s) => s.actions.jump);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;
  return (
    <div className="zdev" role="group" aria-label="Dev panel">
      <style>{CSS}</style>
      <div className="zdev-row">
        <button type="button" aria-pressed={project === 'spotify'} onClick={() => jump('spotify:stage')}>
          Spotify
        </button>
        <button type="button" aria-pressed={project === 'amazon'} onClick={() => jump('amazon:stage')}>
          Amazon
        </button>
      </div>
      <div className="zdev-row">
        {ROOMS.map((to) => (
          <button key={to} type="button" onClick={() => jump(to)}>
            {to}
          </button>
        ))}
        {JUMPS.map((to) => (
          <button key={to} type="button" onClick={() => jump(to === 'stage-pou' ? 'pou-stage' : to)}>
            {to}
          </button>
        ))}
      </div>
      <div className="zdev-row">
        <button type="button" onClick={() => void engine()?.handIn('first')}>
          Send rough file
        </button>
        <button type="button" onClick={() => void engine()?.handIn('last')}>
          Send clean file
        </button>
      </div>
    </div>
  );
}
