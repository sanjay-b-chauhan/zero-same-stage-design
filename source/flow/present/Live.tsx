/* b36: the way into stage 5's live call. After the practice with Eryn, the composer's key is Join the call, which mounts the
   call over the page. ?present=lobby|call|check|present|qa|review|report|finish opens it at that point, for the shots. */
import { lazy, Suspense, type ReactElement } from 'react';
import { create } from 'zustand';
import type { CallStep } from './Call';

const Call = lazy(() => import('./Call').then((m) => ({ default: m.Call })));
const STEPS: CallStep[] = ['lobby', 'call', 'check', 'present', 'qa', 'review', 'report', 'finish'];
const asked = new URLSearchParams(location.search).get('present') as CallStep | null;

export const useLive = create<{ on: CallStep | null; tab: 'moments' | 'scores'; n: number }>(() => ({
  on: asked && STEPS.includes(asked) ? asked : null,
  tab: 'moments',
  n: 0,
}));

export const joinCall = () => useLive.setState({ on: 'lobby', tab: 'moments' });

/* b37: the dev list opens the call at any of its moments, the feedback on either tab */
export const openCall = (on: CallStep, tab: 'moments' | 'scores' = 'moments') => useLive.setState((s) => ({ on, tab, n: s.n + 1 }));

export function LiveRun({ onDone }: { onDone: () => void }): ReactElement | null {
  const on = useLive((s) => s.on);
  const n = useLive((s) => s.n);
  if (!on) return null;
  return (
    <Suspense fallback={null}>
      <Call key={n} from={on} onExit={() => useLive.setState({ on: null })} onDone={() => (useLive.setState({ on: null }), onDone())} />
    </Suspense>
  );
}
