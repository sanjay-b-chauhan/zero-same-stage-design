/* The meeting notes in our own language: b36's slab beside the film, its notes glyph, our type. After her hello the panel
   slides in on its own as the film narrows. One list a chapter she teaches, its heading as she reaches it. When you say you
   are clear, her key points for that chapter write themselves in at the top, a line at a time; your own rows stay under
   them. Enter adds a row under the one you are on, Backspace on an empty row takes it away. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ProjectId } from '../../types';
import { kick, useKick } from '../kickoff';
import { addAfter, focusDone, notesReset, removeRow, setText, useNotes, writeMs, type Note } from '../notesStore';
import { runOf } from '../run';
import './notes.css';

let seeded: ProjectId | null = null;

/* b36's notes glyph (open.html IC.notes) */
function NotesGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 2.5v3M15 2.5v3M8.5 10h7M8.5 14h5" />
    </svg>
  );
}

function Row({ segId, note, first, quiet, reading }: { segId: string; note: Note; first: boolean; quiet?: boolean; reading?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const focus = useNotes((s) => s.focus === note.id);
  const scan = useNotes((s) => s.scan === note.id);
  /* b26: once its tag has risen away the line gets its full width back */
  const [tagGone, setTagGone] = useState(false);
  const tag = !!note.xp && !tagGone;
  useEffect(() => {
    const el = ref.current;
    if (!focus || !el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
    focusDone();
  }, [focus]);
  return (
    <li
      className="nt-row"
      data-quiet={quiet || undefined}
      data-verdict={note.verdict}
      data-reading={(reading || scan) && note.text.trim() ? '1' : undefined}
      data-paid={tag ? '1' : undefined}
    >
      <span className="nt-dot" aria-hidden />
      <textarea
        ref={ref}
        rows={1}
        value={note.text}
        placeholder={first || quiet ? 'Take a note...' : 'Write here...'}
        aria-label="Note"
        readOnly={reading}
        spellCheck={false}
        onChange={(e) => setText(segId, note.id, e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addAfter(segId, note.id);
          } else if (e.key === 'Backspace' && !note.text) {
            e.preventDefault();
            removeRow(segId, note.id);
          }
        }}
      />
      {tag ? (
        <span className="nt-xp" onAnimationEnd={() => setTagGone(true)}>
          +{note.xp} XP
        </span>
      ) : null}
    </li>
  );
}

/* one of her key points: it writes itself in, left to right, the length of the line setting the pace */
function Point({ note }: { note: Note }) {
  return (
    <li className="nt-row nt-pt" style={{ '--nt-w': `${writeMs(note.text)}ms` } as React.CSSProperties}>
      <span className="nt-dot" aria-hidden />
      <span className="nt-pt-t">{note.text}</span>
    </li>
  );
}

/* the panel beside the film */
export function NotesPanel({ pid, on }: { pid: ProjectId; on: boolean }) {
  const chapters = useNotes((s) => s.chapters);
  const checking = useNotes((s) => s.checking);
  const reading = useNotes((s) => s.reading);
  const paid = useNotes((s) => s.paid);
  const head = checking ? 'check' : paid ? 'paid' : 'rest';
  const seg = useKick((s) => s.seg);
  const body = useRef<HTMLDivElement>(null);

  /* one set of notes a project, kept while you replay its meeting. Read from the project itself: this runs before the
     Room has set the meeting up */
  useLayoutEffect(() => {
    if (seeded === pid && useNotes.getState().chapters.length) return;
    seeded = pid;
    notesReset(pid, runOf(pid));
  }, [pid]);

  const segs = kick.run().segments;
  const at = (segId: string) => segs.findIndex((s) => s.id === segId);
  const firstAt = chapters.length ? at(chapters[0].segId) : 0;
  const shown = chapters.filter((c) => at(c.segId) <= Math.max(seg, firstAt) || c.notes.some((x) => x.text.trim()));
  const lines = shown.reduce((n, c) => n + c.notes.length, 0);

  /* a chapter she has just reached, or a point just written, comes into view */
  const seen = useRef(lines);
  useEffect(() => {
    const el = body.current;
    if (el && lines > seen.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    seen.current = lines;
  }, [lines]);


  return (
    <aside className="nt" data-on={on ? '1' : '0'} aria-label="Meeting notes" inert={!on}>
      <header className="nt-hd">
        <span className="nt-hi">
          <NotesGlyph />
        </span>
        <span key={head} className="nt-ht" data-head={head}>
          {head === 'check' ? 'Reading your notes' : head === 'paid' ? `+${paid?.amount} XP · Notes check` : 'Meeting notes'}
        </span>
      </header>
      <div ref={body} className="nt-bd">
        {shown.map((c, si) => {
          const mine = c.notes.filter((x) => x.by === 'me');
          const hers = c.notes.filter((x) => x.by === 'her');
          /* b17: once your own lines were checked, the points you missed are written under them, not over them */
          const checked = mine.some((x) => x.verdict);
          /* b14 (his note: "we don't need to take note every freaking time ... it's very obvious ... after the first"):
             only the first section says Take a note; after it the empty line waits unseen, and shows on hover or focus */
          const quiet = si > 0 && mine.length === 1 && !mine[0].text;
          return (
            <section key={c.segId} className="nt-sec">
              <h3>{c.label}</h3>
              <ul>
                {!checked &&
                  hers.map((x) => (
                    <Point key={x.id} note={x} />
                  ))}
                {mine.map((x, i) => (
                  <Row key={x.id} segId={c.segId} note={x} first={i === 0} quiet={quiet} reading={checking === c.segId && reading} />
                ))}
                {checked &&
                  hers.map((x) => (
                    <Point key={x.id} note={x} />
                  ))}
              </ul>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
