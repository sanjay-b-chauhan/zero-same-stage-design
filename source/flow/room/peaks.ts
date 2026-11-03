/* The real loudness of a voice note, in a few buckets, for its waveform. Decoded once per file and kept.
   Anything that fails (no audio support, a missing file) leaves the even wave b36 draws when it has no envelope. */
import { useEffect, useState } from 'react';

const cache = new Map<string, number[]>();
const pending = new Map<string, Promise<number[] | null>>();
let ctx: OfflineAudioContext | null = null;

const BUCKETS = 64;

async function decode(url: string): Promise<number[] | null> {
  try {
    ctx = ctx ?? new OfflineAudioContext(1, 1, 22050);
    const buf = await (await fetch(url)).arrayBuffer();
    const audio = await ctx.decodeAudioData(buf);
    const data = audio.getChannelData(0);
    const size = Math.max(1, Math.floor(data.length / BUCKETS));
    const out: number[] = [];
    for (let b = 0; b < BUCKETS; b++) {
      let sum = 0;
      const from = b * size;
      const to = Math.min(data.length, from + size);
      for (let i = from; i < to; i++) sum += data[i] * data[i];
      out.push(Math.sqrt(sum / Math.max(1, to - from)));
    }
    const top = Math.max(...out, 1e-4);
    const norm = out.map((v) => Math.min(1, v / top));
    cache.set(url, norm);
    return norm;
  } catch {
    return null;
  }
}

export function usePeaks(url: string | undefined): number[] | null {
  const [peaks, setPeaks] = useState<number[] | null>(() => (url ? cache.get(url) ?? null : null));
  useEffect(() => {
    if (!url || cache.has(url)) {
      setPeaks(url ? cache.get(url) ?? null : null);
      return;
    }
    let live = true;
    const p = pending.get(url) ?? decode(url);
    pending.set(url, p);
    void p.then((v) => {
      if (live) setPeaks(v);
    });
    return () => {
      live = false;
    };
  }, [url]);
  return peaks;
}

/* b36's bar count for a note this long, and each bar's height */
export function barsFor(dur: number, peaks: number[] | null): number[] {
  const n = Math.max(16, Math.min(36, Math.round(14 + dur * 2.6)));
  return Array.from({ length: n }, (_, i) => {
    const v = peaks ? peaks[Math.floor((i / n) * peaks.length)] : 0.4;
    return Math.max(3, Math.round(3 + v * 19));
  });
}
