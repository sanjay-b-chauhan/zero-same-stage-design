/* Her voice for a co-work answer that has no recorded take: the browser's own speech, free, and it asks for nothing.
   The words come out as she says them (the word boundaries the voice reports), and her circle follows a speech-shaped level,
   since the browser never hands over the real loudness. No voice, a muted one, or a test browser: the words still come out at
   a speaking pace with the same level, silent. */
import { voiceRate, voiceVolume } from '../audio';
import { clock } from '../clock';
import { plan, speechLevel } from '../pip/fakeVoice';

export interface Spoken {
  stop(): void;
  done: Promise<void>;
}

type Who = 'eryn' | 'aaron';

const TICK_MS = 40;
const START_WAIT_MS = 900; /* a voice that has not started by now never will: pace it silently instead */
const PREFER: Record<Who, string[]> = {
  eryn: ['Samantha', 'Google US English', 'Ava', 'Allison', 'Susan', 'Zoe', 'Karen', 'Tessa'],
  aaron: ['Aaron', 'Evan', 'Tom', 'Nathan', 'Alex', 'Daniel', 'Google UK English Male', 'Fred'],
};

let current: { stop: () => void } | null = null;

/* she stops mid word the moment you talk or type over her */
export function hushSpeech(): void {
  const c = current;
  current = null;
  c?.stop();
}

const synth = (): SpeechSynthesis | null => {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  } catch {
    return null;
  }
};

/* a headless test browser speaks through the Mac's own speech, past its muted tab. It stays silent */
const testing = (): boolean => {
  try {
    return navigator.webdriver === true || /HeadlessChrome/.test(navigator.userAgent);
  } catch {
    return true;
  }
};

const pick = (s: SpeechSynthesis, who: Who): SpeechSynthesisVoice | null => {
  let all: SpeechSynthesisVoice[] = [];
  try {
    all = s.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
  } catch {
    return null;
  }
  for (const name of PREFER[who]) {
    const v = all.find((x) => x.name === name || x.name.startsWith(`${name} `));
    if (v) return v;
  }
  return all.find((v) => /en[-_]US/i.test(v.lang)) ?? all[0] ?? null;
};

const starts = (t: string): number[] => {
  const a: number[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) a.push(m.index);
  return a;
};

export function speak(text: string, who: Who, o: { onWord: (n: number) => void; onLevel: (v: number) => void }): Spoken {
  hushSpeech();
  const words = text.trim().split(/\s+/).filter(Boolean);
  const at = starts(text);
  const N = words.length;
  const t0 = performance.now();
  let n = 0;
  let over = false;
  let wordAt = t0; /* when the word now being said began */
  let paced = false;
  let resolve: () => void = () => {};
  const done = new Promise<void>((res) => {
    resolve = res;
  });
  /* her pace without a voice: the same syllable timing the listening side uses, a touch quicker */
  const ends = plan(words).ends.map((e) => e * 0.92);
  const say = (k: number) => {
    const v = Math.min(N, k);
    if (v <= n) return;
    n = v;
    wordAt = performance.now();
    o.onWord(n);
  };

  const s = testing() || voiceVolume() === 0 ? null : synth();
  let u: SpeechSynthesisUtterance | null = null;
  let started = false;

  const finish = () => {
    if (over) return;
    over = true;
    clock.clearInterval(tick);
    clock.clearTimeout(watch);
    clock.clearTimeout(cap);
    if (u) {
      u.onboundary = null;
      u.onend = null;
      u.onerror = null;
      u.onstart = null;
    }
    say(N);
    o.onLevel(0);
    if (current === me) current = null;
    resolve();
  };
  const me = {
    stop: () => {
      if (over) return;
      try {
        if (u && s) s.cancel();
      } catch {
        /* nothing was speaking */
      }
      finish();
    },
  };
  current = me;

  /* the level: a syllable shape on the word being said, or on the clock when the voice reports no boundaries */
  const tick = clock.setInterval(() => {
    if (over) return;
    const now = performance.now();
    if (paced || !s) {
      const t = now - t0;
      let k = 0;
      while (k < ends.length && ends[k] <= t) k++;
      say(Math.max(1, k + 1));
      o.onLevel(speechLevel(words, t / 0.92));
      if (t > (ends[ends.length - 1] ?? 0) + 160) finish();
      return;
    }
    if (!started) return;
    const word = words[Math.max(0, n - 1)] ?? '';
    o.onLevel(Math.max(0.06, speechLevel([word], (now - wordAt) * 0.85)));
  }, TICK_MS);

  const pace = () => {
    if (over || paced) return;
    paced = true;
    try {
      if (u && s) s.cancel();
    } catch {
      /* already quiet */
    }
  };
  const watch = clock.setTimeout(() => {
    if (!started) pace();
  }, START_WAIT_MS);
  /* a voice that goes quiet without saying it ended still lets her finish the line */
  const cap = clock.setTimeout(() => finish(), START_WAIT_MS + (ends[ends.length - 1] ?? 0) * 2.2 + 2000);

  if (s && N) {
    try {
      u = new SpeechSynthesisUtterance(text);
      const v = pick(s, who);
      if (v) u.voice = v;
      u.lang = v?.lang ?? 'en-US';
      u.rate = Math.min(1.6, Math.max(0.8, voiceRate() * 1.05));
      u.volume = voiceVolume();
      u.onstart = () => {
        started = true;
        say(1);
      };
      u.onboundary = (e) => {
        if (paced || (e.name && e.name !== 'word')) return;
        started = true;
        let k = 0;
        while (k < N && at[k] <= e.charIndex) k++;
        say(k);
      };
      u.onend = () => {
        if (!paced) finish();
      };
      u.onerror = () => pace();
      s.cancel();
      s.speak(u);
    } catch {
      pace();
    }
  } else {
    paced = true;
  }
  if (!N) finish();
  return { stop: me.stop, done };
}
