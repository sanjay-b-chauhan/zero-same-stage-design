/* The kickoff film: what the system generated for this run, in our design. The run's own panels and reveals (its
   set_panel and show cues, at the second her voice crosses them) drive our kit deck, which carries the system deck's
   panel ids and words in our type and tokens. Pure from (chapter, second), so a seek, a pause or a dev landing is right
   by construction. A chapter with a video is her on camera instead, muted here and held to her voice. A run with the v4
   film draws it instead of the deck: the film's own page in a frame, put on the second the meeting is at, every frame. */
import { useEffect, useRef } from 'react';
import type { ProjectId } from '../types';
import { deckAt } from './deck/cues';
import Deck from './deck/Deck';
import { kick, useKick } from './kickoff';
import { usePrefs } from './prefs';

/* how far the picture may drift from her voice before it is put back */
const DRIFT = 0.25;
const V4_FILM = 'static/kickoff/v4/film.html';

type V4Win = Window & { __v4?: { render: (t: number) => void } };

/* the v4 film's clock: where the chapter starts on it plus the second inside it. Her hello holds the film's first frame */
function V4Film() {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const run = kick.run();
    const first = run.segments.find((x) => x.film_at !== undefined)?.film_at ?? 0;
    const paint = () => {
      const f = (frame.current?.contentWindow as V4Win | null)?.__v4;
      if (!f) return;
      const { seg, t } = useKick.getState();
      const at = run.segments[seg]?.film_at;
      f.render(at === undefined ? first : at + t);
    };
    const el = frame.current;
    el?.addEventListener('load', paint);
    paint();
    const off = useKick.subscribe(paint);
    return () => {
      off();
      el?.removeEventListener('load', paint);
    };
  }, []);
  return <iframe ref={frame} className="sf-v4" src={V4_FILM} title="Kickoff film" tabIndex={-1} aria-hidden />;
}

export default function SystemFilm({ pid }: { pid: ProjectId }) {
  const video = useRef<HTMLVideoElement>(null);
  const run = kick.run();
  const sound = usePrefs((s) => s.sound);
  const onVideo = useKick((s) => !!run.segments[s.seg]?.video);
  const clip = run.segments.find((s) => s.video)?.video;
  /* one string for what is on, so the deck redraws only when a cue is crossed */
  const at = useKick((s) => {
    const now = s.phase === 'done' ? (run.segments[s.seg]?.audio_duration_sec ?? s.t) : s.t;
    const d = deckAt(run, s.seg, now);
    return `${d.panel}#${[...d.shown].sort().join('|')}`;
  });
  const [panel, ids] = at.split('#');
  const shown = new Set(ids ? ids.split('|') : []);

  /* her video follows her voice: plays and pauses with it, at its speed, and is put back if it drifts */
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const follow = () => {
      const { seg: i, t, playing } = useKick.getState();
      if (!run.segments[i]?.video) {
        if (!v.paused) v.pause();
        return;
      }
      const rate = usePrefs.getState().speed;
      if (v.playbackRate !== rate) v.playbackRate = rate;
      /* it holds its last frame: play on an ended video would rewind it to her first */
      const end = (Number.isFinite(v.duration) ? v.duration : Infinity) - 0.04;
      const want = Math.min(t, end);
      if (Math.abs(v.currentTime - want) > DRIFT) v.currentTime = want;
      if (playing && v.paused && t < end) void v.play().catch(() => undefined);
      if (!playing && !v.paused) v.pause();
    };
    follow();
    const offK = useKick.subscribe(follow);
    const offP = usePrefs.subscribe(follow);
    return () => {
      offK();
      offP();
    };
  }, [run]);

  return (
    <div className="sf" data-video={onVideo ? '1' : '0'}>
      {run.film === 'v4' ? <V4Film /> : <div className="sf-deck">{panel && <Deck project={pid} panel={panel} shown={shown} quiet={!sound || onVideo} />}</div>}
      {clip && <video className="sf-video" ref={video} src={clip} muted playsInline preload="auto" aria-hidden />}
    </div>
  );
}
