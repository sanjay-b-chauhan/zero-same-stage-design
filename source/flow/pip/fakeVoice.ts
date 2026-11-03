/* A voice without a microphone (his note, 2 Nov: "lets fake it untill we make it"). Nothing asks the browser for anything.
   A person talking is syllables at about five a second, grouped in words, a short breath at a comma and a longer one at the end
   of a thought, and a quiet floor in between that never sits perfectly still. That signal drives the bars and her circle, and
   each word is "heard" a beat after it is said, the way live captions trail the voice. */
import { clock } from '../clock';

const TICK_MS = 40;
const LEAD_MS = 420; /* the breath before the first word */
const SYL_MS = 118;
const WORD_GAP_MS = 46;
const COMMA_MS = 260;
const STOP_MS = 430;
const HEARD_LAG_MS = 140;
const RUSH_WORD_MS = 70; /* letting go early: the rest of the words catch up quickly */

export interface Voice {
  /* the level now, 0 to 1 */
  level(): number;
  /* letting go before the last word: the rest come out quickly, then it ends */
  rush(): void;
  stop(): void;
  /* resolves after the last word is heard */
  done: Promise<void>;
}

interface Bump {
  at: number;
  ms: number;
  amp: number;
}

/* vowel groups, at least one: a fair count of syllables for a spoken English word */
const syllables = (w: string): number => Math.max(1, (w.toLowerCase().replace(/[^a-z]/g, '').match(/[aeiouy]+/g) ?? []).length);

/* a seeded wobble, so the same words always sound the same */
const rng = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h >>> 0) % 10000) / 10000;
  };
};

/* when each word ends, and the syllable bumps that make the level, from the words alone */
export function plan(words: string[]): { ends: number[]; bumps: Bump[]; total: number } {
  const r = rng(words.join(' '));
  const ends: number[] = [];
  const bumps: Bump[] = [];
  let t = LEAD_MS;
  words.forEach((w) => {
    const n = syllables(w);
    for (let i = 0; i < n; i++) {
      const ms = SYL_MS * (0.75 + r() * 0.5);
      /* the stressed syllable is louder, the last one of a thought falls away */
      const amp = 0.42 + r() * 0.46 - (i === n - 1 && /[.?!]$/.test(w) ? 0.16 : 0);
      bumps.push({ at: t, ms, amp });
      t += ms * 0.86;
    }
    ends.push(t);
    t += /[.?!]$/.test(w) ? STOP_MS : /[,;:]$/.test(w) ? COMMA_MS : WORD_GAP_MS + r() * 40;
  });
  return { ends, bumps, total: t };
}

/* a raised cosine: up from nothing and back down, like the energy of one syllable */
const bumpAt = (b: Bump, t: number): number => {
  const x = (t - b.at) / b.ms;
  if (x <= 0 || x >= 1) return 0;
  return b.amp * 0.5 * (1 - Math.cos(2 * Math.PI * x));
};

/* Speaks the words as a level and a running count of words heard. onLevel and onHeard are called on the clock. */
export function fakeVoice(words: string[], o: { onLevel: (v: number) => void; onHeard: (n: number) => void }): Voice {
  const { ends, bumps } = plan(words);
  const start = performance.now();
  const r = rng(`${words.length}:${start}`);
  let heard = 0;
  let rushAt = -1;
  let rushFrom = 0;
  let over = false;
  let lastLevel = 0;
  let resolve: () => void = () => {};
  const done = new Promise<void>((res) => {
    resolve = res;
  });

  const finish = () => {
    if (over) return;
    over = true;
    clock.clearInterval(id);
    if (heard < words.length) o.onHeard((heard = words.length));
    o.onLevel((lastLevel = 0));
    resolve();
  };

  const tick = () => {
    if (over) return;
    const t = performance.now() - start;
    let v = 0;
    if (rushAt >= 0) {
      /* catching up: a quick fall to the floor while the last words land */
      const k = Math.max(0, 1 - (t - rushAt) / 260);
      v = lastLevel * k;
      const due = rushFrom + Math.floor((t - rushAt) / RUSH_WORD_MS) + 1;
      if (due > heard) o.onHeard((heard = Math.min(words.length, due)));
      if (heard >= words.length) finish();
    } else {
      for (const b of bumps) {
        if (b.at > t) break;
        v = Math.max(v, bumpAt(b, t));
      }
      let n = heard;
      while (n < ends.length && ends[n] + HEARD_LAG_MS <= t) n++;
      if (n !== heard) o.onHeard((heard = n));
      if (heard >= words.length) {
        finish();
        return;
      }
    }
    /* the room is never silent: a small floor that breathes */
    const floor = 0.03 + r() * 0.035;
    lastLevel = Math.min(1, Math.max(floor, v + (r() - 0.5) * 0.05));
    o.onLevel(lastLevel);
  };

  const id = clock.setInterval(tick, TICK_MS);
  tick();

  return {
    level: () => lastLevel,
    rush: () => {
      if (over || rushAt >= 0) return;
      rushAt = performance.now() - start;
      rushFrom = heard;
    },
    stop: () => {
      if (over) return;
      over = true;
      clock.clearInterval(id);
      o.onLevel(0);
      resolve();
    },
    done,
  };
}

/* the quiet a person leaves after their last word, before a tap counts as finished */
export const TRAIL_MS = 900;

/* A floor that keeps breathing while you hold on after your last word. */
export function roomTone(onLevel: (v: number) => void): () => void {
  const r = rng(String(performance.now()));
  const id = clock.setInterval(() => onLevel(0.03 + r() * 0.035), TICK_MS);
  return () => {
    clock.clearInterval(id);
    onLevel(0);
  };
}

/* her own voice when there is no audio to read: the same shape, a little steadier */
export function speechLevel(words: string[], at: number): number {
  const { bumps } = plan(words);
  let v = 0;
  for (const b of bumps) {
    if (b.at > at) break;
    v = Math.max(v, bumpAt(b, at));
  }
  return v;
}
