/* What the clock runs on, so a window closing never eats a pending timer.
   A timer or a frame armed on a PiP window dies with it: her take's level loop freezes and any clock.wait never resolves.
   This stands in as the clock's host from the start, knows everything pending, and moves it when the window changes.
   The ids start high so clock.ts clearing "both windows" can never hit a real timer of the parent. */
import { clock } from '../clock';

type Job =
  | { kind: 'timeout'; fn: () => void; due: number; real: number; on: Window }
  | { kind: 'interval'; fn: () => void; every: number; real: number; on: Window }
  | { kind: 'raf'; fn: FrameRequestCallback; real: number; on: Window };

const jobs = new Map<number, Job>();
let target: Window = window;
let nextId = 1_000_000_000;

const disarm = (job: Job) => {
  try {
    if (job.kind === 'timeout') job.on.clearTimeout(job.real);
    else if (job.kind === 'interval') job.on.clearInterval(job.real);
    else job.on.cancelAnimationFrame(job.real);
  } catch {
    /* the window is already gone, and so is the timer */
  }
};

const arm = (id: number, job: Job) => {
  job.on = target;
  if (job.kind === 'timeout') {
    job.real = target.setTimeout(() => {
      jobs.delete(id);
      job.fn();
    }, Math.max(0, job.due - Date.now()));
  } else if (job.kind === 'interval') {
    job.real = target.setInterval(job.fn, job.every);
  } else {
    job.real = target.requestAnimationFrame((t) => {
      jobs.delete(id);
      job.fn(t);
    });
  }
};

const add = (job: Job): number => {
  const id = nextId++;
  jobs.set(id, job);
  arm(id, job);
  return id;
};

const drop = (id: number) => {
  const job = jobs.get(id);
  if (!job) return;
  jobs.delete(id);
  disarm(job);
};

const shim = {
  setTimeout: (fn: () => void, ms: number) => add({ kind: 'timeout', fn, due: Date.now() + ms, real: 0, on: target }),
  clearTimeout: drop,
  setInterval: (fn: () => void, ms: number) => add({ kind: 'interval', fn, every: ms, real: 0, on: target }),
  clearInterval: drop,
  requestAnimationFrame: (fn: FrameRequestCallback) => add({ kind: 'raf', fn, real: 0, on: target }),
  cancelAnimationFrame: drop,
};

clock.useWindow(shim as unknown as Window);

/* The PiP window on open, null on close. Everything pending moves with it. */
export const runTimersOn = (w: Window | null): void => {
  const next = w ?? window;
  if (next === target) return;
  target = next;
  jobs.forEach((job, id) => {
    disarm(job);
    arm(id, job);
  });
  /* anyone listening on clock.onSwitch still hears about it */
  clock.useWindow(shim as unknown as Window);
};
