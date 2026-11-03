/* The real voice note, in dark. Numbers read from TrainingShared/Chat/VoiceModuleStatic.tsx and VoiceNote.tsx:
   big: pill 62 high, padding 10, gap 8, button 42, glyph 27 corner 3.2, 18 bars 3.15 wide gap 3.82 max 28, timer column 56.
   pip: their sm size: pill 54, button 38, glyph 18, 14 bars 2.8 wide gap 2 max 13.
   Toggle: 12 uppercase, gap 8, padding 10, chevron 12, under the pill by 4. Transcript 14 / 1.5, opens under the toggle. */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeAudioWaveformWithMeta } from '@/renderer/utils/audioWaveform';
import { playTrianglePath } from '@/renderer/utils/playTrianglePath';
import { clock } from '../../clock';
import { pauseVoice, playTake, resumeVoice, seekVoice, voiceNow, voiceRate } from '../../audio';
import { useFlow } from '../../engine/store';
import type { Surface } from '../../types';
import { useDraft } from './draft';
import { mmss, seededBars } from './util';

const NUMBERS = {
  big: { bars: 18, maxBar: 28, srcMax: 24, glyph: 27 },
  pip: { bars: 14, maxBar: 13, srcMax: 24, glyph: 18 },
};
const SPEEDS = [1, 1.2, 2];

/* one ticker for all pills, running only while somebody listens */
const listeners = new Set<() => void>();
let tick = 0;
let snapshot = 0;
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  if (!tick) {
    tick = clock.setInterval(() => {
      snapshot++;
      listeners.forEach((l) => l());
    }, 120);
  }
  return () => {
    listeners.delete(fn);
    if (!listeners.size && tick) {
      clock.clearInterval(tick);
      tick = 0;
    }
  };
};

const barCache = new Map<string, number[]>();

function useBars(url: string | undefined, seed: string): number[] {
  const [bars, setBars] = useState<number[]>(() => (url && barCache.get(url)) || seededBars(seed, 18));
  useEffect(() => {
    if (!url || barCache.has(url)) return;
    let gone = false;
    analyzeAudioWaveformWithMeta(url, 18)
      .then((r) => {
        if (gone || !r) return;
        barCache.set(url, r.bars);
        setBars(r.bars);
      })
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [url]);
  return bars;
}

export interface VoicePillProps {
  id: string;
  surface: Surface;
  own?: boolean;
  url?: string;
  dur: number;
  text?: string;
  withFace?: React.ReactNode;
}

export default function VoicePill({ id, surface, own, url, dur, text, withFace }: VoicePillProps) {
  const n = NUMBERS[surface];
  const bars = useBars(url, id);
  const setLevel = useFlow((s) => s.actions.setLevel);
  const open = useDraft((s) => !!s.noteOpen[id]);
  const patch = useDraft((s) => s.patch);
  const wave = useRef<HTMLDivElement>(null);

  useSyncExternalStore(subscribe, () => snapshot);
  const now = url ? voiceNow() : null;
  const mine = !!now && !!url && now.url === url;
  const playing = mine && !now.paused;
  const t = mine ? now.t : 0;
  const total = mine && now.dur > 0 ? now.dur : dur;
  const played = total > 0 ? Math.floor((t / total) * n.bars) : 0;
  /* a finished take goes back to rest, the same as the real voice note */
  const started = mine && t > 0 && !now.ended;
  const shown = started ? t : Math.ceil(total);
  const speed = voiceRate();

  const toggle = () => {
    if (!url) return;
    if (mine) {
      if (playing) pauseVoice();
      else resumeVoice();
    } else {
      void playTake(url, { onLevel: setLevel });
    }
  };
  const seek = (e: MouseEvent<HTMLDivElement>) => {
    if (!mine || !wave.current || total <= 0) return;
    const r = wave.current.getBoundingClientRect();
    seekVoice((Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))) * total);
  };
  const cycle = () => voiceRate(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]);

  const glyph = useMemo(() => playTrianglePath(3.2), []);
  const hasText = !!text && text.trim().length > 0;

  return (
    <div className="zs2-note" data-own={own || undefined} data-surface={surface}>
      {withFace}
      <div className="zs2-note-col">
        <div className="zs2-pill" data-playing={playing || undefined}>
          <button
            type="button"
            className="zs2-pill-btn"
            aria-label={playing ? 'Pause' : 'Play'}
            disabled={!url}
            onClick={toggle}
          >
            {playing ? (
              <svg width={n.glyph} height={n.glyph} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="6.3" y="5" width="4.2" height="14" rx="2.1" />
                <rect x="13.5" y="5" width="4.2" height="14" rx="2.1" />
              </svg>
            ) : (
              <svg width={n.glyph} height={n.glyph} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d={glyph} />
              </svg>
            )}
          </button>
          <div ref={wave} className="zs2-pill-wave" onClick={seek} role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={total} aria-valuenow={t}>
            {bars.slice(0, n.bars).map((h, i) => (
              <span
                key={i}
                className="zs2-pill-bar"
                data-played={(started && i < played) || undefined}
                style={{ height: Math.min((h * (surface === 'big' ? n.maxBar : 24)) / n.srcMax, n.maxBar) }}
              />
            ))}
          </div>
          <div className="zs2-pill-time">
            <span>{mmss(shown)}</span>
            <span className="zs2-pill-speedslot" data-on={playing || undefined}>
              <button type="button" className="zs2-pill-speed" tabIndex={playing ? 0 : -1} aria-label={`Speed ${speed}x`} onClick={cycle}>
                {speed}x
              </button>
            </span>
          </div>
        </div>
        {hasText && (
          <>
            <button
              type="button"
              className="zs2-transcript-t"
              aria-expanded={open}
              onClick={() => patch('noteOpen', id, !open)}
            >
              <span>transcript</span>
              {open ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}
            </button>
            <div className="zs2-transcript" data-open={open || undefined}>
              <div className="zs2-transcript-in">
                <p>{text}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
