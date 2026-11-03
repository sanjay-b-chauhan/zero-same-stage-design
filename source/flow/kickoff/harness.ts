/* The real kickoff and the real POU, driven at the same seams the app uses. Owner: kickoff agent.
   Exports are the contract main.tsx reads: outputData, teamMembers, sendKickoffPouMessage, socketClient, view.
   The POU brain hears your transcript and answers at npc_flow with the real frames. Words and regexes: content/check.ts. */
import { toOutputValidation } from '@/renderer/windows/newMainUI/pilotWebUI/components/KickoffMeeting/utils/kickoffRunTransformer';
import type { TeamMember } from '@/renderer/windows/newMainUI/types';
import { useUserStore } from '@/renderer/windows/newMainUI/stores/userStore';
import { useUserStore as useAuthUserStore } from '@/renderer/stores/userStore';
import { useUserXPStore } from '@/renderer/windows/newMainUI/stores/userXPStore';
import { installSocketEvents } from '@/renderer/types/socketEvents/impl';
import type { ISocketClient } from '@/renderer/services/socket/base/client';
import { CHECK, END_ALL, END_SOME, NOT_HEARD, VOICE_OF, toldThenEnd, toldThenNext } from '../../content/check';
import { takeFor } from '../../content/takes';
import { FACE, PROJECT, RUN } from './project';

installSocketEvents();

const QS = new URLSearchParams(location.search);
export const outputData = toOutputValidation(RUN as never);

const USER_ID = 'harness-learner';
const SCENARIO_ID = RUN.scenario_id;
const NPC = RUN.cast[0];
const META = RUN.metadata;

useAuthUserStore.setState({ userId: USER_ID, userName: 'Sanjay' } as never);

useUserXPStore.setState({
  userXP: {
    id: 'harness',
    user_id: USER_ID,
    total_xp: Number(QS.get('xp') ?? 1240),
    last_updated: new Date().toISOString(),
  },
} as never);

const segParam = QS.get('seg');
export const view = QS.get('view');
const snapKey = `kickoff-reload-snapshot:${USER_ID}:${SCENARIO_ID}`;
if (QS.get('keep') !== '1') {
  if (segParam !== null) {
    const idx = Number(segParam);
    localStorage.setItem(
      snapKey,
      JSON.stringify({
        version: 1,
        subView: 'meeting',
        meetingPhase: QS.get('phase') ?? 'playing',
        currentSegmentIndex: idx,
        currentSegmentId: outputData.segments[idx]?.id ?? null,
        updatedAt: Date.now(),
      })
    );
  } else if (view === 'pou') {
    localStorage.setItem(
      snapKey,
      JSON.stringify({
        version: 1,
        subView: 'sync-check-chat',
        meetingPhase: 'sync-check',
        currentSegmentIndex: outputData.segments.length - 1,
        currentSegmentId: outputData.segments[outputData.segments.length - 1]?.id ?? null,
        updatedAt: Date.now(),
      })
    );
  }
}

useUserStore.setState({
  user: {
    id: USER_ID,
    name: 'Sanjay',
    email: 'sanjay@zero.local',
    selectedCompany: { id: PROJECT, name: META.company_name },
    currentScenario: { id: SCENARIO_ID, name: META.scenario_title, title: META.scenario_title },
    currentStage: { id: `${SCENARIO_ID}-stage`, name: 'Kickoff' },
  },
} as never);

/* ---------- team: the one-on-one manager ---------------------------------- */

export const teamMembers: TeamMember[] = [
  {
    id: NPC.person_id,
    name: NPC.name.trim(),
    role: META.speaker_role.trim(),
    status: 'online',
    avatar: {
      initials: META.avatar_initials,
      backgroundColor: '#E7CBA9',
      textColor: '#3A2C1B',
      containerBackgroundColor: '#E7CBA9',
      containerGradient: 'linear-gradient(180deg, #E7CBA9, #E7CBA9)',
      url: FACE[PROJECT],
    },
  } as unknown as TeamMember,
];

/* ---------- restored note-checker progress (read-only notes in the PoU) ---- */

interface H {
  noteCheckerProgress: unknown;
  pouProgress: unknown;
  primeMic?: () => void;
}
const harness = (window as unknown as { __harness: H }).__harness;

if (QS.get('notes') === '1') {
  const pointOf = new Map(RUN.context_points.map((p) => [p.id, p]));
  harness.noteCheckerProgress = {
    training_status: view === 'pou' ? 'completed' : 'in_progress',
    progress: {
      segment_results: RUN.lines.segments
        .map((s) => ({ s, lines: s.lines.filter((l) => l.context_point_id) }))
        .filter(({ lines }) => lines.length > 0)
        .map(({ s, lines }) => ({
          segment_id: s.id,
          total_xp: lines.length * 10,
          points: lines.map((l, i) => ({
            id: `${s.id}-n${i}`,
            text: pointOf.get(l.context_point_id as string)?.description ?? l.text,
            status: 'correct',
            xp: 10,
            matched: [{ context_point_id: l.context_point_id, line_id: l.line_id }],
          })),
        })),
    },
  };
}

/* ---------- the POU brain ---------------------------------------------------
   Two misses on a question and she says it and moves on. Same hearing as b1: the question you're on hears everything
   you've said for it so far, the others hear only this answer, so you can cover two in one go. */

const LINES = CHECK[PROJECT];
const VOICE = VOICE_OF[PROJECT];
const PRAISE = [
  { emoji: '👍', word: 'Good' },
  { emoji: '🔥', word: 'Nailed it' },
  { emoji: '❤️', word: 'Well put' },
];

interface Turn {
  say: string;
  pct: number;
  done: boolean;
  reaction: { emoji: string; word: string } | null;
  sentiment: 'positive' | 'neutral' | 'soft_negative';
  quality: 'normal' | 'blank';
}

const brain = {
  state: LINES.map(() => 'open' as 'open' | 'heard' | 'told'),
  tries: 0,
  said: '',
  praised: 0,
  current() {
    return brain.state.indexOf('open');
  },
  pct() {
    const got = brain.state.reduce((n, s) => n + (s === 'heard' ? 1 : s === 'told' ? 0.5 : 0), 0);
    return brain.current() < 0 ? 100 : Math.round((got / LINES.length) * 100);
  },
  praise() {
    return PRAISE[brain.praised++ % PRAISE.length];
  },
  step(raw: string | undefined): Turn {
    const text = (raw ?? '').trim();
    const at = brain.current();
    const turn = (say: string, reaction: Turn['reaction'], sentiment: Turn['sentiment'], quality: Turn['quality'] = 'normal'): Turn => ({
      say,
      pct: brain.pct(),
      done: brain.current() < 0,
      reaction,
      sentiment,
      quality,
    });
    if (at < 0) return turn(END_ALL, null, 'positive');
    if (!text) return turn(NOT_HEARD, null, 'neutral', 'blank');

    brain.said = `${brain.said} ${text}`;
    let hit = false;
    LINES.forEach((line, i) => {
      if (brain.state[i] !== 'open') return;
      const hay = i === at ? brain.said : text;
      if (line.hear.every((r) => r.test(hay))) {
        brain.state[i] = 'heard';
        hit = true;
      }
    });

    if (hit) {
      if (brain.state[at] !== 'open') {
        brain.tries = 0;
        brain.said = '';
      }
      const next = brain.current();
      if (next >= 0) return turn(LINES[next].q, brain.tries === 0 ? brain.praise() : PRAISE[0], 'positive');
      return turn(brain.state.includes('told') ? END_SOME : END_ALL, brain.praise(), 'positive');
    }

    brain.tries += 1;
    if (brain.tries < 2) return turn(LINES[at].more[brain.tries - 1], null, 'soft_negative');

    brain.state[at] = 'told';
    brain.tries = 0;
    brain.said = '';
    const next = brain.current();
    return next >= 0
      ? turn(toldThenNext(LINES[at].say, LINES[next].q), null, 'neutral')
      : turn(toldThenEnd(LINES[at].say), null, 'neutral');
  },
};

const voiceUrl = (text: string) => {
  const take = takeFor(text, VOICE);
  if (!take) console.warn('[harness] no take for', text);
  return take?.url ?? null;
};

const emit = (frame: Record<string, unknown>) =>
  (window as unknown as { socketEvents: { emitMessage: (s: string, d: unknown) => void } }).socketEvents.emitMessage('npc_flow', frame);

interface Pou {
  mode: 'auto' | 'manual';
  sent: Array<Record<string, unknown>>;
  pct: number;
  reactionMs: number;
  responseMs: number;
  startMs: number;
  brain: typeof brain;
  pending: Turn | null;
  lastKey: string | null;
  emit: typeof emit;
  /* the answer we use when this browser can't hear you */
  sample: () => string;
  hear: (text: string | undefined) => void;
  answer: (eventKey: string) => void;
  reactOnly: (eventKey: string) => void;
  respondOnly: (eventKey: string) => void;
}

const pou: Pou = {
  mode: QS.get('pou') === 'manual' ? 'manual' : 'auto',
  sent: [],
  pct: 0,
  reactionMs: 1100,
  responseMs: 2400,
  startMs: 700,
  brain,
  pending: null,
  lastKey: null,
  emit,
  sample() {
    const at = brain.current();
    return at < 0 ? '' : LINES[at].sample;
  },
  hear(text) {
    pou.pending = brain.step(text);
  },
  reactOnly(eventKey) {
    const t = pou.pending;
    if (!t) return;
    emit({
      type: 'kickoff_pou_reaction',
      status: 'generating_audio',
      code: 200,
      event_key: eventKey,
      npc_reaction: t.reaction?.emoji ?? null,
      npc_reaction_text: t.reaction?.word ?? null,
      prev_understanding_pct: pou.pct,
      understanding_pct: t.pct,
      pou_progress: { understanding_percentage: t.pct },
    });
  },
  respondOnly(eventKey) {
    const t = pou.pending;
    if (!t) return;
    pou.pct = t.pct;
    emit({
      type: 'kickoff_pou_response',
      event_type: 'message',
      generated: true,
      ai_response: t.say,
      voice_url: voiceUrl(t.say),
      is_complete: t.done,
      pou_progress: { understanding_percentage: t.pct },
      sentiment: t.sentiment,
      input_quality: t.quality,
      npc_reaction: t.reaction?.emoji ?? null,
      npc_reaction_text: t.reaction?.word ?? null,
      status: 'completed',
      code: 200,
      event_key: eventKey,
      message_part: 1,
      total_parts: 1,
    });
  },
  answer(eventKey) {
    setTimeout(() => pou.reactOnly(eventKey), pou.reactionMs);
    setTimeout(() => pou.respondOnly(eventKey), pou.responseMs);
  },
};
(window as unknown as { __pou: Pou }).__pou = pou;

export const sendKickoffPouMessage = (msg: unknown) => {
  const payload = msg as { event_type?: string; user_input?: string };
  const eventKey = `pou_${Math.random().toString(36).slice(2, 10)}`;
  pou.sent.push({ ...(payload as object), event_key: eventKey, at: Date.now() });
  pou.lastKey = eventKey;
  console.info('[harness] pou send', payload.event_type, eventKey);
  const first = LINES[Math.max(brain.current(), 0)].q;
  if (payload.event_type === 'start') {
    harness.primeMic?.();
    setTimeout(
      () =>
        emit({
          type: 'kickoff_pou_response',
          event_type: 'start',
          generated: true,
          ai_response: first,
          voice_url: voiceUrl(first),
          is_complete: false,
          pou_progress: { understanding_percentage: 0 },
          status: 'completed',
          code: 200,
          event_key: eventKey,
          message_part: 1,
          total_parts: 1,
        }),
      pou.startMs
    );
  } else if (payload.event_type === 'resume') {
    harness.primeMic?.();
    setTimeout(
      () =>
        emit({
          type: 'kickoff_pou_response',
          event_type: 'resume',
          generated: false,
          ai_response: null,
          voice_url: null,
          chat_history: [{ role: 'npc', content: first, voice_url: voiceUrl(first), event_key: 'h0' }],
          is_complete: false,
          pou_progress: { understanding_percentage: pou.pct },
          status: 'completed',
          code: 200,
          event_key: eventKey,
        }),
      pou.startMs
    );
  } else if (payload.event_type === 'message') {
    pou.hear(payload.user_input);
    if (pou.mode === 'auto') pou.answer(eventKey);
  }
  return eventKey;
};

/* The pause card's Ask. She answers from what she just told you in this segment. Scripted and free. */
const NOT_A_TOPIC = /^(what|when|where|which|who|why|how|does|did|the|and|are|you|your|mean|that|this|with|for|can|could|would|tell|about|more|please|just|have|has|was|were|will|not|our|they|them|there|here|like|get|got|meant|said|say)$/;

const pointsOf = (segmentId: unknown) => {
  const lines = RUN.lines.segments.find((seg) => seg.id === segmentId)?.lines ?? [];
  const ids = new Set(lines.map((l) => l.context_point_id).filter(Boolean));
  return RUN.context_points.filter((p) => ids.has(p.id));
};

const answerAsk = (segmentId: unknown, asked: string): string => {
  const points = pointsOf(segmentId);
  const words = (asked.toLowerCase().match(/[a-z0-9']{3,}/g) ?? []).filter((w) => !NOT_A_TOPIC.test(w));
  const count = (text: string) => words.filter((w) => text.toLowerCase().includes(w)).length;
  const best = [...points, ...RUN.context_points]
    .map((p) => ({ p, n: count(`${p.term} ${p.description}`) }))
    .reduce((a, b) => (b.n > a.n ? b : a), { p: points[0], n: 0 });
  if (best.n > 0) return best.p.description;
  return points[0]
    ? `We'll get to that once we're in the project. What matters right now is this. ${points[0].description}`
    : "We'll get to that once we're in the project. Keep going and you'll see it.";
};

const replyToChat = (payload: Record<string, unknown>, eventKey: string) => {
  if (payload?.action !== 'kickoff_segment_chat') return;
  const npcResponse =
    payload.event_type === 'start'
      ? "Yeah, go ahead. What's your question?"
      : payload.event_type === 'message'
        ? answerAsk(payload.segment_id, String(payload.user_input ?? ''))
        : null;
  setTimeout(() => {
    emit({
      type: 'kickoff_segment_chat_response',
      event_type: payload.event_type,
      segment_id: payload.segment_id,
      event_key: eventKey,
      npc_response: npcResponse,
      can_proceed: false,
    });
  }, npcResponse ? 900 : 0);
};

export const socketClient = {
  connectionState: 'connected',
  send: (payload: Record<string, unknown>) => {
    const eventKey = `evt_${Math.random().toString(36).slice(2, 10)}`;
    replyToChat(payload, eventKey);
    return eventKey;
  },
  deQueue: () => {},
  getQueueStatus: () => undefined,
  getAllQueues: () => [],
  connect: () => {},
  close: () => {},
  addTimeOut: () => {},
  clearEventTimeOut: () => {},
  refreshPendingEventDeadlines: () => {},
  dispose: () => {},
} as unknown as ISocketClient;
