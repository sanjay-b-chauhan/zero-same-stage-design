/* The meeting notes, one list a chapter that teaches something. When you say you are clear, the chapter's key points write
   themselves in, one at a time; your own rows stay under them. */
import { create } from 'zustand';
import type { ProjectId } from '../types';
import { gradeNotes, pointsOf, SAMPLE_NOTES, takesNotes, type Verdict } from './grade';
import type { Run } from './run';
import { sfx, timerGroup } from './prefs';

export interface Note {
  id: string;
  text: string;
  by: 'me' | 'her';
  verdict?: Verdict;
  point?: string; /* the point it covers, its term shows on hover */
  xp?: number; /* b23: what this line earned, shown at its end */
}

export interface Chapter {
  segId: string;
  label: string;
  notes: Note[];
  graded: boolean;
}

interface NotesState {
  chapters: Chapter[];
  focus: string | null; /* the row that should take the caret next */
  checking: string | null; /* the chapter being checked right now */
  reading: boolean; /* b17: the first beat of a check, every line you wrote read at once before any verdict */
  scan: string | null; /* b23: the one line being read right now */
  paid: { segId: string; amount: number } | null; /* b17: what the last check paid, said in the panel's head */
}

export const useNotes = create<NotesState>(() => ({ chapters: [], focus: null, checking: null, reading: false, scan: null, paid: null }));

let n = 0;
const nid = () => `n${++n}`;
const blank = (): Note => ({ id: nid(), text: '', by: 'me' });
const timers = timerGroup();

let run: Run | null = null;
let project: ProjectId = 'spotify';

const patch = (segId: string, fn: (c: Chapter) => Chapter) =>
  useNotes.setState((s) => ({ chapters: s.chapters.map((c) => (c.segId === segId ? fn(c) : c)) }));

export const chapterOf = (segId: string) => useNotes.getState().chapters.find((c) => c.segId === segId);

export function notesReset(p: ProjectId, r: Run) {
  timers.clear();
  project = p;
  run = r;
  const chapters = r.segments.filter(takesNotes).map((s) => ({ segId: s.id, label: s.label, notes: [blank()], graded: false }));
  useNotes.setState({ chapters, focus: null, checking: null, reading: false, scan: null, paid: null });
}

export function notesStop() {
  timers.clear();
  useNotes.setState({ checking: null, reading: false, scan: null });
}

export function setText(segId: string, id: string, text: string) {
  patch(segId, (c) => ({ ...c, notes: c.notes.map((x) => (x.id === id ? { ...x, text, verdict: undefined, point: undefined } : x)) }));
}

/* Enter: a new row right under this one */
export function addAfter(segId: string, id: string) {
  const fresh = blank();
  patch(segId, (c) => {
    const i = c.notes.findIndex((x) => x.id === id);
    const notes = [...c.notes];
    notes.splice(i + 1, 0, fresh);
    return { ...c, notes };
  });
  useNotes.setState({ focus: fresh.id });
}

/* Backspace on an empty row: it goes, the caret goes up */
export function removeRow(segId: string, id: string) {
  const c = chapterOf(segId);
  if (!c) return;
  const mine = c.notes.filter((x) => x.by === 'me');
  if (mine.length < 2) return;
  const i = c.notes.findIndex((x) => x.id === id);
  const prev = c.notes.slice(0, i).reverse().find((x) => x.by === 'me');
  patch(segId, (ch) => ({ ...ch, notes: ch.notes.filter((x) => x.id !== id) }));
  useNotes.setState({ focus: prev?.id ?? null });
}

export const focusDone = () => useNotes.setState({ focus: null });

/* the sample notes a person in a hurry writes, for tests and developer mode */
export function fillSample(segId: string) {
  const texts = SAMPLE_NOTES[project]?.[segId] ?? [];
  if (!texts.length) return;
  patch(segId, (c) => ({ ...c, graded: false, notes: texts.map((text) => ({ id: nid(), text, by: 'me' as const })) }));
}

export const hasWritten = (segId: string) => !!chapterOf(segId)?.notes.some((x) => x.by === 'me' && x.text.trim());

const SCAN_MS = 520;
const LAND_MS = 260;

/* what a check paid, said in the panel's head for a moment */
export function notesPaid(segId: string, amount: number) {
  useNotes.setState({ paid: amount > 0 ? { segId, amount } : null });
  if (amount > 0) timers.after(PAID_MS, () => useNotes.setState((st) => (st.paid?.segId === segId ? { paid: null } : st)));
}
const PAID_MS = 2800;

export const hitsOf = (segId: string) => chapterOf(segId)?.notes.filter((x) => x.by === 'me' && x.verdict === 'hit').length ?? 0;
/* b23 (his note: "give +50, +25, +25, +50"): each matched line pays in turn, 50 then 25, 25, 50, and round again */
const LINE_XP = [50, 25, 25, 50];
export const xpOf = (segId: string) => chapterOf(segId)?.notes.reduce((n, x) => n + (x.by === 'me' ? x.xp ?? 0 : 0), 0) ?? 0;

/* The check. animate: one tick at a time with a soft sound, then her rows. Calls done when the last one has landed. */
export function gradeChapter(segId: string, animate: boolean, done?: () => void) {
  const c = chapterOf(segId);
  const seg = run?.segments.find((s) => s.id === segId);
  if (!c || !seg || !run) {
    done?.();
    return;
  }
  timers.clear();
  const mine = c.notes.filter((x) => x.by === 'me' && x.text.trim());
  const g = gradeNotes(pointsOf(run, seg), mine);
  const hers: Note[] = g.missed.map((p) => ({ id: nid(), text: p.description, by: 'her', point: p.id }));
  const verdictOf = new Map(g.verdicts.map((v) => [v.id, v]));
  let paidN = 0;
  const xpFor = new Map(mine.map((x) => [x.id, verdictOf.get(x.id)?.verdict === 'hit' ? LINE_XP[paidN++ % LINE_XP.length] : undefined]));
  const finalNotes = [...mine.map((x) => ({ ...x, verdict: verdictOf.get(x.id)?.verdict, point: verdictOf.get(x.id)?.point, xp: xpFor.get(x.id) })), ...hers];

  if (!animate) {
    patch(segId, (ch) => ({ ...ch, graded: true, notes: finalNotes }));
    done?.();
    return;
  }

  /* blank rows go first, so every read lands on something written. b23 (his note: "scan each note in a better manner"):
     one line at a time, a light passes along it, then its verdict and what it earned land on it before the next is read */
  patch(segId, (ch) => ({ ...ch, notes: mine }));
  useNotes.setState({ checking: segId, reading: false, scan: null, paid: null });
  let at = mine.length ? 260 : 0;
  let hitN = 0;
  mine.forEach((note) => {
    timers.after(at, () => useNotes.setState({ scan: note.id }));
    at += SCAN_MS;
    timers.after(at, () => {
      const v = verdictOf.get(note.id);
      useNotes.setState({ scan: null });
      patch(segId, (ch) => ({ ...ch, notes: ch.notes.map((x) => (x.id === note.id ? { ...x, verdict: v?.verdict, point: v?.point, xp: xpFor.get(note.id) } : x)) }));
      if (v?.verdict === 'hit') sfx.hit(hitN++);
    });
    at += LAND_MS;
  });
  let last = mine.length ? at : 60;
  hers.forEach((h, j) => {
    last = at + 60 + j * 110 + (mine.length ? 0 : -60);
    timers.after(last, () => {
      patch(segId, (ch) => ({ ...ch, notes: [...ch.notes, h] }));
      sfx.land(mine.length + j);
    });
  });
  timers.after(last + 380, () => {
    patch(segId, (ch) => ({ ...ch, graded: true, notes: finalNotes }));
    useNotes.setState({ checking: null, reading: false, scan: null });
    if (!hers.length && mine.length) sfx.ting();
    done?.();
  });
}

/* developer mode: everything before a moment, written and checked, no sound, no wait */
export function seedThrough(segIds: string[], fillOnly?: string) {
  timers.clear();
  useNotes.setState({ checking: null });
  for (const id of segIds) {
    fillSample(id);
    gradeChapter(id, false);
  }
  if (fillOnly) fillSample(fillOnly);
}

/* the key points of a chapter, written in for you: one at a time with a soft sound, then done. Once a chapter */
export function writeChapter(segId: string, animate: boolean, done?: () => void) {
  const c = chapterOf(segId);
  const seg = run?.segments.find((s) => s.id === segId);
  if (!c || !seg || !run || c.graded) {
    done?.();
    return;
  }
  const hers: Note[] = pointsOf(run, seg).map((p) => ({ id: nid(), text: p.description, by: 'her', point: p.id }));
  const mine = c.notes.filter((x) => x.by === 'me');
  if (!animate) {
    patch(segId, (ch) => ({ ...ch, graded: true, notes: [...hers, ...mine] }));
    done?.();
    return;
  }
  patch(segId, (ch) => ({ ...ch, graded: true }));
  let at = 0;
  hers.forEach((h, i) => {
    timers.after(at, () => {
      patch(segId, (ch) => ({ ...ch, notes: [...ch.notes.filter((x) => x.by === 'her'), h, ...ch.notes.filter((x) => x.by === 'me')] }));
      sfx.land(i);
    });
    at += writeMs(h.text) + 120;
  });
  timers.after(at, () => done?.());
}

/* how long one key point takes to write itself */
export const writeMs = (text: string) => Math.min(900, Math.max(380, text.length * 14));

export const notesWritten = (segId: string) => !!chapterOf(segId)?.graded;

/* developer mode and replays: the chapters before segment `n` written, the rest not yet */
export function writeThrough(n: number) {
  if (!run) return;
  timers.clear();
  const r = run;
  r.segments.forEach((s, i) => {
    if (!takesNotes(s)) return;
    if (i < n) writeChapter(s.id, false);
    else patch(s.id, (ch) => ({ ...ch, graded: false, notes: ch.notes.filter((x) => x.by === 'me') }));
  });
}

/* a note said or typed in the check-in card: it joins the chapter, blank rows go */
export function addNote(segId: string, text: string) {
  const t = text.trim();
  if (!t) return;
  patch(segId, (c) => ({ ...c, graded: false, notes: [...c.notes.filter((x) => x.by === 'me' && x.text.trim()), { id: nid(), text: t, by: 'me' as const }] }));
}

/* the points your notes cover so far, in the order she said them */
export function coveredOf(segId: string): string[] {
  const c = chapterOf(segId);
  const seg = run?.segments.find((s) => s.id === segId);
  if (!c || !seg || !run) return [];
  const points = pointsOf(run, seg);
  const g = gradeNotes(
    points,
    c.notes.filter((x) => x.by === 'me' && x.text.trim())
  );
  const missed = new Set(g.missed.map((p) => p.id));
  return points.filter((p) => !missed.has(p.id)).map((p) => p.id);
}

/* the notes you wrote for a chapter, written ones only */
export const writtenOf = (segId: string): string[] =>
  chapterOf(segId)?.notes.filter((x) => x.by === 'me' && x.text.trim()).map((x) => x.text) ?? [];

/* a chapter checked with nothing filled in by her: its mark goes green */
export const wonOf = (segId: string): boolean => {
  const c = chapterOf(segId);
  return !!c?.graded && !c.notes.some((x) => x.by === 'her');
};

export const sampleOf = (segId: string): string[] => SAMPLE_NOTES[project]?.[segId] ?? [];

/* the one empty row of a chapter that has nothing yet, ready for the caret */
export const firstRowOf = (segId: string) => chapterOf(segId)?.notes.find((x) => x.by === 'me')?.id ?? null;
