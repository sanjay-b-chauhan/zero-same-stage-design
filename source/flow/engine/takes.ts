/* Her recorded takes, if the kickoff agent's content/takes.ts is in the build. Vite resolves the glob at build time, so a missing
   file is an empty map and she simply has no voice note on that line. */
import type { VoiceNote } from '../types';

type TakeFor = (text: string, voice?: 'eryn' | 'aaron') => VoiceNote | undefined;

const mods = import.meta.glob('../../content/takes.ts', { eager: true }) as Record<string, { takeFor?: TakeFor }>;
const real = Object.values(mods)[0]?.takeFor;

export const takeFor: TakeFor = (text, voice) => {
  try {
    return real?.(text, voice);
  } catch {
    return undefined;
  }
};
