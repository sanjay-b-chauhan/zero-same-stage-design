/* ---------------------------------------------------------------------------
 * Standalone harness, everything the Electron shell normally provides.
 * Imported FIRST by main.tsx, before any app module, so the globals exist by
 * the time a store or service module body runs.
 * ------------------------------------------------------------------------- */
import { RUN } from './flow/kickoff/project';
import { NOTE_KEYS } from './content/check';

type Json = Record<string, unknown>;

/* Each load of the standalone build starts the flow from the top. The app
 * persists a resume snapshot (sub-view, phase, segment) per user+scenario, and
 * without this a refresh drops you back into the middle of the meeting. */
const QS = new URLSearchParams(location.search);
if (QS.get('keep') !== '1') {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* private mode, nothing to clear */
  }
}

const noop = () => {};

/* Capture-script control surface. */
interface Harness {
  bffDelayMs: number;
  uploadMs: number;
  sttMs: number;
  sttText: string | null;
  micDenied: boolean;
  primeMic: () => void;
  xpPerPoint: number;
  gradeDelayMs: number;
  gradeGapMs: number;
  noteCheckerProgress: unknown;
  pouProgress: unknown;
  fetchLog: string[];
}
const harness: Harness = {
  bffDelayMs: Number(QS.get('bffDelay') ?? 0),
  uploadMs: 400,
  sttMs: 900,
  sttText: null,
  micDenied: false,
  primeMic: noop,
  xpPerPoint: 10,
  gradeDelayMs: Number(QS.get('gradeDelay') ?? 900),
  gradeGapMs: 1200,
  noteCheckerProgress: null,
  pouProgress: null,
  fetchLog: [],
};
(window as unknown as { __harness: Harness }).__harness = harness;

/* ---------- window.electronAPI / platform / credits / notifications ------- */

const asyncNull = async () => null;

/** Subscription-style bridges (`onFoo(cb)`) must hand back an unsubscribe
 *  function, returning a promise strands the cleanup and throws on unmount. */
const bridgeFallback = (prop: string) =>
  prop.startsWith('on') || prop.startsWith('subscribe')
    ? (..._a: unknown[]) => noop
    : async (..._a: unknown[]) => undefined;

const bridge = (own: Json = {}) =>
  new Proxy(own, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === 'then') return undefined; // never look thenable
      return bridgeFallback(String(prop));
    },
  });

/* Env the renderer reads synchronously off the preload cache. Everything here
 * points at a host that only the fetch shim below answers, so no request ever
 * leaves the machine and every query settles instead of retrying. */
const STUB_ORIGIN = 'https://standalone.zero.invalid';
const env = {
  BACKEND_URL: `${STUB_ORIGIN}/api`,
  AI_CORE_BACKEND_URL: `${STUB_ORIGIN}/ai-core`,
  AI_CORE_WEBSOCKET_URL: 'wss://standalone.zero.invalid',
  SUPABASE_URL: STUB_ORIGIN,
  SUPABASE_ANON_KEY: 'standalone-anon-key',
  SUPABASE_SCHEMA: 'zero_learning_dev',
};

const electronAPI = bridge({
  env,
  /* No OS keychain in a browser, null makes the auth adapter fall back to
   * localStorage instead of calling `.get` on a function. */
  secureAuthStore: null,
  getEnv: async () => env,
  getPlatform: async () => 'darwin',
  getAppVersion: async () => '0.0.0-standalone',
  getEnvVariables: async () => env,
  openSettings: asyncNull,
  reportBootRecovery: noop,
  checkMediaAccessStatus: async () => 'granted',
  /* main-process text fetch (deck template, text walkthrough files) */
  fetchTextContent: async (url: string) => {
    try {
      const r = await window.fetch(url);
      if (!r.ok) return { success: false, error: `HTTP ${r.status}` };
      return { success: true, text: await r.text() };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },
  removeAllListeners: noop,
  /* The voice card streams from S3 in the app. Here it is a local copy of the last bundled file. */
  staticMedia: { cachedIds: async (ids: string[]) => ids, prepare: async () => true },
});

Object.assign(window as unknown as Json, {
  electronAPI,
  chromeAPI: bridge(),
  platform: 'darwin',
  creditsAPI: bridge({ getBalance: async () => ({ credits: 9463 }) }),
  notificationsAPI: bridge({
    list: async () => [],
    unreadCount: async () => 0,
    markRead: asyncNull,
  }),
});

/* ---------- fetch shim: platform backend + ai-core REST ------------------- */

const BACKEND_HOSTS = ['standalone.zero.invalid', 'z-ro.co', 'supabase.co/rest', 'localhost:8000'];
const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith('://asset/voice-animation')) return originalFetch('static/media/voice_animation.riv');
  /* Scenario assets, audio and avatars are real files, let them through. */
  const isAsset = /\.(mp3|json|png|jpg|jpeg|webp|riv|woff2?|svg|mp4)(\?|$)/i.test(url);
  if (isAsset || !BACKEND_HOSTS.some((h) => url.includes(h))) return originalFetch(input, init);

  /* Everything else is a learner-progress / telemetry call with no server
   * here. Answer with an empty, well-formed envelope so the queries settle
   * instead of retrying forever. */
  harness.fetchLog.push(url.slice(0, 220));
  if (harness.bffDelayMs > 0) await new Promise((r) => setTimeout(r, harness.bffDelayMs));
  let payload: unknown = { data: null, status: 'ok' };
  if (url.includes('kickoff-note-checker-progress') && harness.noteCheckerProgress)
    payload = { data: harness.noteCheckerProgress };
  if (url.includes('learner-scenario-training-progress')) payload = { data: harness.pouProgress ?? [] };
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

/* ---------- note-checker: a local stand-in for the grading websocket ------ */

interface ContextPoint {
  id: string;
  term: string;
  description: string;
  bucket?: string;
}

const CONTEXT_POINTS: ContextPoint[] = RUN.context_points;
const LINE_OF = new Map<string, { line_id: string; segment_id: string }>();
RUN.lines.segments.forEach((s) =>
  s.lines.forEach((l) => {
    if (l.context_point_id) LINE_OF.set(l.context_point_id, { line_id: l.line_id, segment_id: s.id });
  })
);

const STOP = new Set([
  'the','a','an','and','or','of','to','in','on','for','is','are','we','our','it','its','that',
  'this','with','be','by','as','at','from','new','need','needs','main','their','they',
]);

const words = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9%\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP.has(w))
  );

/** Score a learner note against a context point: every keyword group of that point has to land,
 *  shared words only break a tie. A point spoken in the segment you're on wins a tie too. */
function score(noteText: string, point: ContextPoint, segmentId: string): number {
  const keys = NOTE_KEYS[point.id];
  if (!keys || !keys.every((r) => r.test(noteText))) return 0;
  const n = words(noteText);
  const p = words(`${point.term} ${point.description}`);
  let hits = 3;
  for (const w of p) if (n.has(w)) hits += 1;
  return hits + (LINE_OF.get(point.id)?.segment_id === segmentId ? 0.5 : 0);
}

const XP_PER_POINT = 10;

interface SubmitMsg {
  action: string;
  segment_id: string;
  attempt_id: string;
  event_key: string;
  user_id: string;
  points: Array<{ id: string; text: string }>;
}

class NoteCheckerSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  url: string;
  readyState = 0;
  binaryType: BinaryType = 'blob';
  bufferedAmount = 0;
  extensions = '';
  protocol = '';

  onopen: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;

  private claimed = new Set<string>();

  constructor(url: string) {
    super();
    this.url = url;
    setTimeout(() => {
      this.readyState = 1;
      const e = new Event('open');
      this.onopen?.(e);
      this.dispatchEvent(e);
    }, 60);
  }

  private emit(payload: Json, delay = 0) {
    setTimeout(() => {
      if (this.readyState !== 1) return;
      const e = new MessageEvent('message', { data: JSON.stringify(payload) });
      this.onmessage?.(e);
      this.dispatchEvent(e);
    }, delay);
  }

  private stamp() {
    return {
      request_id: `req_${Math.random().toString(36).slice(2, 10)}`,
      timestamp: new Date().toISOString(),
    };
  }

  send(raw: string) {
    let msg: SubmitMsg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.action === 'auth') {
      this.emit(
        { type: 'connection_registered', status: 'ok', code: 200, session_id: 'standalone', event_key: 'auth', ...this.stamp() },
        80
      );
      return;
    }

    if (msg.action !== 'submit_segment') return;

    const { segment_id, attempt_id, event_key, user_id, points = [] } = msg;
    const base = { segment_id, attempt_id, event_key, ...this.stamp() };

    this.emit({ type: 'processing_status', status: 'processing', code: 202, ...base }, 260);
    const T0 = harness.gradeDelayMs;
    const GAP = harness.gradeGapMs;

    /* Grade every submitted note against the scenario's real context points,
     * one at a time, streamed the way the backend streams them. */
    const graded = points.map(({ id, text }) => {
      const best = CONTEXT_POINTS
        .filter((p) => !this.claimed.has(p.id))
        .map((p) => ({ p, s: score(text, p, segment_id) }))
        .sort((a, b) => b.s - a.s)[0];
      const hit = !!best && best.s > 0;
      if (hit) this.claimed.add(best.p.id);
      return {
        id,
        text,
        status: (hit ? 'correct' : 'incorrect') as 'correct' | 'incorrect',
        matched: hit ? [{ context_point_id: best.p.id, line_id: LINE_OF.get(best.p.id)?.line_id ?? '' }] : [],
        xp: hit ? harness.xpPerPoint : 0,
      };
    });

    graded.forEach((point, i) => {
      this.emit({ type: 'point_result', point, ...base }, T0 + i * GAP);
      /* The XP bubble flight (NotesPanel -> XpBubbleRiveFly -> the badge) only
       * fires for a note once its async `performance_result` confirmation
       * lands, event_id IS the note's point id. Without this frame the tick
       * and the +xp show but nothing ever flies to the top XP pill. */
      if (point.status === 'correct') {
        this.emit(
          {
            type: 'performance_result',
            learner_id: user_id,
            event_id: point.id,
            event_key,
            touchpoint: 'note_checker',
            generated_at: new Date().toISOString(),
            ...this.stamp(),
          },
          T0 + i * GAP + 550
        );
      }
    });

    const correct = graded.filter((g) => g.status === 'correct').length;
    this.emit(
      {
        type: 'segment_result',
        status: 'completed',
        code: 200,
        user_id,
        streamed: true,
        ...base,
        result: {
          segment_id,
          points: graded,
          summary: {
            required: [...LINE_OF.values()].filter((l) => l.segment_id === segment_id).length,
            hit: correct,
            missed: Math.max(0, points.length - correct),
            submitted: points.length,
            correct,
            incorrect: points.length - correct,
          },
          total_xp: correct * harness.xpPerPoint,
        },
      },
      T0 + graded.length * GAP + 700
    );
  }

  close() {
    this.readyState = 3;
    const e = new CloseEvent('close', { code: 1000, reason: 'normal', wasClean: true });
    this.onclose?.(e);
    this.dispatchEvent(e);
  }
}

/** Any other socket the flow opens (PoU chat, notifications) connects and then
 *  stays quiet, those surfaces are not part of this export. */
class SilentSocket extends NoteCheckerSocket {
  send() {}
}

const RealWebSocket = window.WebSocket;

window.WebSocket = function (url: string | URL, protocols?: string | string[]) {
  const href = typeof url === 'string' ? url : url.href;
  if (href.includes('note_checker')) return new NoteCheckerSocket(href) as unknown as WebSocket;
  if (/^wss?:\/\/(localhost|127\.0\.0\.1)/.test(href) && !href.includes('vite'))
    return new SilentSocket(href) as unknown as WebSocket;
  if (/z-ro\.co|supabase\.co/.test(href)) return new SilentSocket(href) as unknown as WebSocket;
  return new RealWebSocket(url, protocols);
} as unknown as typeof WebSocket;

Object.assign(window.WebSocket, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
  prototype: RealWebSocket.prototype,
});

/* Diagnostic: surface any <video> media error with its code, the kickoff
 * treats a video error as "segment complete", which silently skips the cut. */
document.addEventListener(
  'error',
  (e) => {
    const t = e.target as HTMLVideoElement | null;
    if (t && t.tagName === 'VIDEO') {
      console.error('[standalone] video error', t.error?.code, t.error?.message, t.currentSrc);
    }
  },
  true
);

/* ---------- capture aid: keep a handle on every <audio> the app creates, so a
 * capture script can jump the narration near a segment end. Playback itself is
 * untouched. ------------------------------------------------------------- */
{
  const RealAudio = window.Audio;
  const registry: HTMLAudioElement[] = [];
  (window as unknown as { __audios: HTMLAudioElement[] }).__audios = registry;
  const Wrapped = function (this: unknown, src?: string) {
    const a = new RealAudio(src);
    registry.push(a);
    return a;
  } as unknown as typeof Audio;
  Wrapped.prototype = RealAudio.prototype;
  window.Audio = Wrapped;
  const realCreate = document.createElement.bind(document);
  document.createElement = function (tag: string, opts?: ElementCreationOptions) {
    const el = realCreate(tag, opts);
    if (String(tag).toLowerCase() === 'audio') registry.push(el as HTMLAudioElement);
    return el;
  } as typeof document.createElement;
}

/* ---------- measuring aid (ONLY with ?openframe=1): let the capture script read
 * computed styles inside the deck iframe by adding allow-same-origin to its
 * sandbox. Rendering is unchanged; never on for the normal screenshots. ----- */
if (QS.get('openframe') === '1') {
  const realSet = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name: string, value: string) {
    if (this instanceof HTMLIFrameElement && name.toLowerCase() === 'sandbox' && !/allow-same-origin/.test(value)) {
      return realSet.call(this, name, `${value} allow-same-origin`);
    }
    return realSet.call(this, name, value);
  };
}

/* ---------- microphone: the real one. The synthetic stream only runs with ?mic=fake, or as the safety net when the
 * real mic is denied or missing, so a denied permission never strands the flow. The answer then comes from the
 * current question's sample (stubs/useKickoffStt.ts reads harness.micDenied). -------------------------------- */
try {
  const FAKE_MIC = QS.get('mic') === 'fake';
  const md = (navigator.mediaDevices ?? {}) as MediaDevices;
  const realGet = md.getUserMedia?.bind(md);
  const realEnum = md.enumerateDevices?.bind(md);
  const fakeStream = async (): Promise<MediaStream> => {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    await ctx.resume().catch(() => {});
    const dest = ctx.createMediaStreamDestination();
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfoGain = ctx.createGain();
    osc.frequency.value = 180;
    lfo.frequency.value = 3.1;
    gain.gain.value = 0.25;
    lfoGain.gain.value = 0.22;
    lfo.connect(lfoGain).connect(gain.gain);
    osc.connect(gain).connect(dest);
    osc.start();
    lfo.start();
    return dest.stream;
  };
  const synthDevice = { deviceId: 'default', kind: 'audioinput', label: 'Harness microphone', groupId: 'h' };
  const getUserMedia = async (c?: MediaStreamConstraints): Promise<MediaStream> => {
    if (FAKE_MIC) return fakeStream();
    if (!realGet) {
      harness.micDenied = true;
      return fakeStream();
    }
    try {
      const stream = await realGet(c);
      harness.micDenied = false;
      return stream;
    } catch (e) {
      console.warn('[harness] mic unavailable, using the sample answers', e);
      harness.micDenied = true;
      return fakeStream();
    }
  };
  const enumerateDevices = async () => {
    if (FAKE_MIC || !realEnum) return [synthDevice] as unknown as MediaDeviceInfo[];
    try {
      const list = await realEnum();
      return list.some((d) => d.kind === 'audioinput') ? list : ([...list, synthDevice] as unknown as MediaDeviceInfo[]);
    } catch {
      return [synthDevice] as unknown as MediaDeviceInfo[];
    }
  };
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: Object.assign(Object.create(md), {
      getUserMedia,
      enumerateDevices,
      getSupportedConstraints: () => ({}),
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
  /* Ask once when the POU opens, so your first hold isn't lost to the browser's prompt. */
  harness.primeMic = () => {
    if (FAKE_MIC) return;
    getUserMedia({ audio: true })
      .then((s) => s.getTracks().forEach((t) => t.stop()))
      .catch(() => {});
  };
} catch (e) {
  console.warn('[harness] mediaDevices mock failed', e);
}

export {};
