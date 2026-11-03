/* The words as they are said, live: yours while you hold to talk, hers in the PiP bar while she answers.
   Each word comes sharp out of a soft blur where it already sits, the way her streamed lines do. One line keeps the newest
   words in view and lets the oldest slip off the start; the wrapping version is the big composer's two rows.
   Keyed by position, so a new word adds one span and nothing already there is drawn again. */
import './heard.css';
import { useLayoutEffect, useRef } from 'react';
import { useTalk } from '../../pip/talk';

export function WordTail({ words, n, wrap, className }: { words: string[]; n: number; wrap?: boolean; className?: string }) {
  const shown = words.slice(0, Math.max(0, n));
  const box = useRef<HTMLSpanElement>(null);
  /* the line starts at the left; once it runs out of room the newest words hold the right edge */
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || wrap) return;
    const inner = el.firstElementChild as HTMLElement | null;
    const over = !!inner && inner.scrollWidth > el.clientWidth + 1;
    if (over !== el.hasAttribute('data-over')) el.toggleAttribute('data-over', over);
  });
  return (
    <span ref={box} className={`zs2-tail${className ? ` ${className}` : ''}`} data-wrap={wrap || undefined}>
      <span className="zs2-tail-in">
        {shown.map((w, i) => (
          <span key={i} className="zs2-hw">
            {w}
          </span>
        ))}
      </span>
    </span>
  );
}

/* what she is hearing you say */
export default function Heard({ wrap, className }: { wrap?: boolean; className?: string }) {
  const words = useTalk((s) => s.words);
  const n = useTalk((s) => s.heard);
  return <WordTail words={words} n={n} wrap={wrap} className={className} />;
}
