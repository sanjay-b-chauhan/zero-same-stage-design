/* A stand-in for the Room, built to the numbers in the brief: sheet, head, frame, her face, the caption, the bar. Plan owner's tests only. */
import '../../../ds/zero-jobs.css';
import '../../../ds/tokens.css';
import '../../../theme.css';
import './lab.css';

import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

import VoiceFace from '../../../ds/VoiceFace';
import { useFlow } from '../../../engine/store';
import { useCaption } from '../../caption';
import PlanView from '../PlanView';

import.meta.glob('../../../ds/presets.css', { eager: true });

const query = new URLSearchParams(location.search);
if (query.get('zstyle')) document.documentElement.dataset.zstyle = query.get('zstyle') ?? '';
const HEAD_TITLE = query.has('headtitle');
const FIXED = query.has('fixedface');
const devMods = import.meta.glob('../../../dev/DevMode.tsx', { eager: true }) as Record<string, { default: ComponentType }>;
const DevMode = Object.values(devMods)[0]?.default;

function Lab() {
  const screen = useFlow((s) => s.screen);
  const project = useFlow((s) => s.project);
  const caption = useCaption((s) => s.text);
  if (screen === 'stage') return <div style={{ position: 'fixed', inset: 0, background: '#0c0e12' }} data-lab-stage="1" />;
  const mode = screen === 'objective' ? 'objective' : 'breakdown';
  const objective = mode === 'objective';
  return (
    <div className="z-root zj lab" data-mode={mode} data-fixed={FIXED ? '1' : '0'}>
      <div className="lab-sheet">
        <div className="lab-head">
          <span className="zj-round">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </span>
          <span className="zj-lg">
            <img src={project?.logo} alt="" />
          </span>
          {(!objective || HEAD_TITLE) && <span className="lab-title">{project?.title}</span>}
          <span className="zj-grow" />
          <span className="zj-status">Level 5</span>
        </div>
        <div className="lab-body">
          <div className="lab-frame">
            <span className="lab-white" />
            <div className="lab-face">
              <VoiceFace size={64} />
            </div>
            {!objective && <div className="lab-cap">{caption}</div>}
            <PlanView mode={mode} />
          </div>
          <div className="lab-bar" />
        </div>
      </div>
      <span className="z-stamp">b4</span>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <>
    <Lab />
    {DevMode && <DevMode />}
  </>
);
