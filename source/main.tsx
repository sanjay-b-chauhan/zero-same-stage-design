/* b4 entry. One flow, one design language: world, card, brief, kickoff, POU, breakdown, objective, stage. */
import './flow/ds/zero-jobs.css';
import './flow/ds/tokens.css';
import './flow/theme.css';
import './flow/ds/b36.css';
import './flow/ds/looks.css';
import './flow/looks';

import { createRoot } from 'react-dom/client';

import FlowRoot from './flow/FlowRoot';
import DevMode from './flow/dev/DevMode';

createRoot(document.getElementById('root')!).render(
  <>
    <FlowRoot />
    <DevMode />
  </>
);
