/* b36: the way into stage 5's live call. After the practice with Eryn, the composer's key is Join the call, which mounts the
   call over the page. ?present=lobby|call|present|qa|report|finish opens it at that point, for the shots. */
import { lazy, Suspense, type ReactElement } from 'react';
import { create } from 'zustand';
import type { CallStep } from './Call';

const Call = lazy(() => import('./Call').then((m) => ({ default: m.Call })));
const STEPS: CallStep[] = ['lobby', 'call', 'present', 'qa', 'report', 'finish'];
const asked = new URLSearchParams(location.search).get('present') as CallStep | null;

export const useLive = create<{ on: CallStep | null }>(() => ({ on: asked && STEPS.includes(asked) ? asked : null }));

export const joinCall = () => useLive.setState({ on: 'lobby' });

export function LiveRun({ onDone }: { onDone: () => void }): ReactElement | null {
  const on = useLive((s) => s.on);
  if (!on) return null;
  return (
    <Suspense fallback={null}>
      <Call from={on} onExit={() => useLive.setState({ on: null })} onDone={() => (useLive.setState({ on: null }), onDone())} />
    </Suspense>
  );
}
