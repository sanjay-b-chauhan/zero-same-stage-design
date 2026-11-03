/* The kickoff as data: one combined take a chapter, every line with its time, every reveal with its time. */
import runSpotify from '../../data/run_spotify.json';
import runAmazon from '../../data/run_amazon.json';
import kickV4 from '../../data/kickoff_v4.json';
import type { ProjectId } from '../types';

export interface RunCue {
  action: string; /* set_panel or show */
  args: { id: string };
  time_sec: number;
}
export interface RunLine {
  line_id: string;
  text: string;
  start_sec: number;
  end_sec: number;
  context_point_id: string | null;
}
export interface RunSegment {
  id: string;
  seq: number;
  label: string;
  cues: RunCue[];
  lines: RunLine[];
  audio_duration_sec: number;
  segment_combined_audio_url: string;
  /* the real run's segment video: when set, the chapter is her on camera, voice and picture from this one file */
  video?: string;
  /* the v4 film: where this chapter starts on the film's own clock */
  film_at?: number;
}
export interface RunPoint {
  id: string;
  term: string;
  bucket?: string;
  description: string;
}
export interface Run {
  points: RunPoint[];
  segments: RunSegment[];
  total: number;
  /* the system's generated visual for this run (html_video_v1), driven by the cues */
  visual: string;
  /* drawn by the v4 film (static/kickoff/v4/film.html) instead of the kit deck */
  film?: 'v4';
  /* her face cut from her hello's last frame, so the video can close into it: the photo and where it sits in the video */
  hello?: { face: string; w: number; h: number; x: number; y: number; r: number };
}

const read = (raw: unknown): Run => {
  const r = raw as {
    total_duration_sec: number;
    context_points: RunPoint[];
    lines: { segments: RunSegment[]; html_visual?: { template_url?: string } };
  };
  return { points: r.context_points, segments: r.lines.segments, total: r.total_duration_sec, visual: r.lines.html_visual?.template_url ?? '' };
};

/* Spotify opens on Eryn herself: her hello on camera (b36's take, a stand-in until the scenario's own video exists) takes
   the intro chapter, as a real run's segment video does. Amazon has no video of Aaron yet, so his intro stays his voice */
const HELLO = 'static/media/eryn-hello.mp4';
const withHello = (run: Run): Run => {
  const [first, ...rest] = run.segments;
  const line = (line_id: string, text: string, start_sec: number, end_sec: number): RunLine => ({ line_id, text, start_sec, end_sec, context_point_id: null });
  const hello: RunSegment = {
    ...first,
    label: 'Intro',
    cues: [],
    lines: [
      line('hello-1', 'Hey, good to have you.', 0.08, 1.22),
      line('hello-2', "I'm Eryn, I'll be your manager on this one.", 1.7, 3.62),
      line('hello-3', "And honestly, I'm pretty excited about it, so let's dig in.", 4.0, 7.44),
    ],
    audio_duration_sec: 7.678,
    segment_combined_audio_url: HELLO,
    video: HELLO,
  };
  const segments = [hello, ...rest];
  return {
    ...run,
    segments,
    total: segments.reduce((n, s) => n + s.audio_duration_sec, 0),
    hello: { face: 'static/faces/eryn-hello.webp', w: 1280, h: 720, x: 632, y: 240, r: 185 },
  };
};

/* Spotify's meeting is the v4 film (zero-kickoff-dark v4): its voice cut into chapters at the pauses, never stretched, its
   lines timed inside each chapter, the run's key points on the lines that say them. Her hello on camera replaces its first line.
   b13 (his note: "not stopping for the yes and rewatch part"): The question teaches too, so its three points ride on the
   lines that say them and it stops for Are we clear like every chapter after it */
const ROOM_POINTS: (RunPoint & { line: string })[] = [
  { id: 'one_dollar', term: 'One more dollar', bucket: 'The question', description: 'One more dollar a month: most people stay, some cancel.', line: 'If Spotify charged you one more dollar a month, would you cancel?' },
  { id: 'room_math', term: 'The room', bucket: 'The question', description: 'At $12.99, 95 of 100 staying makes more money, 92 makes less.', line: 'If ninety-five people stay, we make more money.' },
  { id: 'eight_walk', term: 'The line', bucket: 'The question', description: 'A dollar is only worth it if fewer than 8 in 100 walk out.', line: "So a dollar's only worth it when fewer than eight people walk out of the room." },
];
const pointRoom = (seg: RunSegment): RunSegment =>
  seg.id !== 'room'
    ? seg
    : { ...seg, lines: seg.lines.map((l) => ({ ...l, context_point_id: ROOM_POINTS.find((p) => p.line === l.text)?.id ?? l.context_point_id })) };
const withV4 = (run: Run): Run => ({
  ...run,
  film: 'v4',
  points: [...ROOM_POINTS.map(({ line: _line, ...p }) => p), ...run.points],
  segments: [run.segments[0], ...(kickV4.segments as RunSegment[]).map(pointRoom)],
});

const RUNS: Record<ProjectId, Run> = { spotify: withHello(withV4(read(runSpotify))), amazon: read(runAmazon) };

export const runOf = (id: ProjectId): Run => RUNS[id];
