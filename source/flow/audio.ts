/* Her voice. Plays in the parent document so it survives a hidden tab, and reports the real loudness at the playhead. */
import { clock } from './clock';

type Level = (v: number) => void;

let ctx: AudioContext | null = null;
let current: { audio: HTMLAudioElement; url: string; stop: () => void; gain: GainNode | null } | null = null;
let rate = 1;
let vol = 1;

const audioCtx = (): AudioContext | null => {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = ctx ?? new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

export function stopVoice() {
  current?.stop();
  current = null;
}

/* Additive, for the voice note pills: what is at the playhead, and the same take paused, resumed, sought, or sped up. */
export function voiceNow(): { url: string; t: number; dur: number; paused: boolean; ended: boolean } | null {
  if (!current) return null;
  const { audio, url } = current;
  return { url, t: audio.currentTime, dur: Number.isFinite(audio.duration) ? audio.duration : 0, paused: audio.paused, ended: audio.ended };
}
export function pauseVoice() {
  current?.audio.pause();
}
export function resumeVoice() {
  void current?.audio.play().catch(() => {});
}
export function seekVoice(t: number) {
  if (current) current.audio.currentTime = t;
}
export function voiceRate(r?: number): number {
  if (r !== undefined) {
    rate = r;
    if (current) current.audio.playbackRate = r;
  }
  return rate;
}
/* Sound off mutes her after the analyser, so her circle still follows the take. */
export function voiceVolume(v?: number): number {
  if (v !== undefined) {
    vol = Math.max(0, Math.min(1, v));
    if (current?.gain) current.gain.gain.value = vol;
    else if (current) current.audio.volume = vol;
  }
  return vol;
}

/* Resolves when the take ends or is stopped. onTime gets seconds at the playhead, for lighting things on her words. */
export function playTake(url: string, opts: { onLevel?: Level; onTime?: (t: number) => void } = {}): Promise<void> {
  stopVoice();
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    let raf = 0;
    let done = false;
    let analyser: AnalyserNode | null = null;
    let gain: GainNode | null = null;
    const c = audioCtx();
    if (c) {
      try {
        const src = c.createMediaElementSource(audio);
        analyser = c.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.55;
        gain = c.createGain();
        gain.gain.value = vol;
        src.connect(analyser);
        analyser.connect(gain);
        gain.connect(c.destination);
      } catch {
        analyser = null;
        gain = null;
      }
    }
    if (!gain) audio.volume = vol;
    const buf = analyser ? new Uint8Array(analyser.fftSize) : null;
    const finish = () => {
      if (done) return;
      done = true;
      clock.cancelRaf(raf);
      opts.onLevel?.(0);
      resolve();
    };
    const loop = () => {
      if (done) return;
      if (analyser && buf) {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const x = (buf[i] - 128) / 128;
          sum += x * x;
        }
        opts.onLevel?.(Math.min(1, Math.sqrt(sum / buf.length) * 3.2));
      }
      opts.onTime?.(audio.currentTime);
      raf = clock.raf(loop);
    };
    audio.onended = finish;
    audio.onerror = finish;
    audio.playbackRate = rate;
    current = {
      audio,
      url,
      gain,
      stop: () => {
        audio.pause();
        finish();
      },
    };
    audio.play().then(loop).catch(finish);
  });
}

let tingCtxTime = 0;
const tone = (f: number, at: number, dur: number, g: number, type: OscillatorType = 'sine') => {
  const c = audioCtx();
  if (!c) return;
  const o = c.createOscillator();
  const v = c.createGain();
  const t = c.currentTime + at;
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  v.gain.setValueAtTime(0, t);
  v.gain.linearRampToValueAtTime(g, t + 0.006);
  v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(v);
  v.connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
};

/* The press of a key. One very short low sine, nothing to load. */
export function softClick() {
  tone(420, 0, 0.05, 0.035);
}
/* A row or a slot landing on her word. Quieter than the ting, for runs of ten. */
export function softLand(i = 0) {
  tone(880 + i * 22, 0, 0.09, 0.022);
}

/* A soft ting when a slot lands. Two short sines, nothing to load. */
export function ting() {
  const now = performance.now();
  if (now - tingCtxTime < 60) return;
  tingCtxTime = now;
  tone(1318.5, 0, 0.28, 0.07);
  tone(1975.5, 0.07, 0.4, 0.05);
}

/* b23 (his note: "the sound is not even good"): a matched note. A small mallet on a rising pentatonic step, a warm body
   under a bright strike, so a run of matches climbs instead of beeping the same beep */
const MALLET = [783.99, 880, 1046.5, 1174.66, 1318.51, 1568];
export function noteHit(i = 0) {
  const f = MALLET[Math.min(i, MALLET.length - 1)];
  tone(f, 0, 0.55, 0.05);
  tone(f * 2, 0, 0.16, 0.018);
  tone(f / 2, 0, 0.22, 0.03, 'triangle');
}
