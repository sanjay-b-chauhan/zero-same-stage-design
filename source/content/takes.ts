/* takeFor: her recorded take for an exact line of text. The manifest is written by tools/make_takes.mjs.
   Two people can say the same words, so it is keyed by voice and text. The voice follows the project unless you name one. */
import manifest from './takes.manifest.json';
import type { VoiceNote } from '../flow/types';
import type { VoiceKey } from './check.ts';

interface Entry {
  takeId: string;
  url: string;
  dur: number;
}

const TAKES = manifest as unknown as Record<string, Entry>;

const projectVoice = (): VoiceKey =>
  new URLSearchParams(location.search).get('project') === 'amazon' ? 'aaron' : 'eryn';

export function takeFor(text: string, voice: VoiceKey = projectVoice()): VoiceNote | undefined {
  const e = TAKES[`${voice}|${text}`];
  return e ? { takeId: e.takeId, url: e.url, dur: e.dur, text } : undefined;
}
