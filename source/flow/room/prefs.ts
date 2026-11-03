/* The player's three settings and the Room's soft sounds, which follow the Sound setting. */
import { create } from 'zustand';
import * as audio from '../audio';

export type Speed = 1 | 1.2 | 2;
export const SPEEDS: Speed[] = [1, 1.2, 2];

interface Prefs {
  speed: Speed;
  cc: boolean;
  sound: boolean;
}

export const usePrefs = create<Prefs>(() => ({ speed: 1, cc: false, sound: true }));

/* Sound covers her voice and the Room's own sounds */
export const setSound = (on: boolean) => {
  usePrefs.setState({ sound: on });
  audio.voiceVolume(on ? 1 : 0);
};

const on = () => usePrefs.getState().sound;

export const sfx = {
  click: () => on() && audio.softClick(),
  land: (i = 0) => on() && audio.softLand(i),
  ting: () => on() && audio.ting(),
  hit: (i = 0) => on() && audio.noteHit(i),
};

/* a group of timers that all go at once, for anything that must stop on a mode change or a jump */
export function timerGroup() {
  const ids = new Set<number>();
  return {
    after(ms: number, fn: () => void): number {
      const id = window.setTimeout(() => {
        ids.delete(id);
        fn();
      }, ms);
      ids.add(id);
      return id;
    },
    clear() {
      ids.forEach((id) => window.clearTimeout(id));
      ids.clear();
    },
  };
}
