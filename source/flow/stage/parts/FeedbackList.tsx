/* One sentence per item. Tick it and it collapses to a compact row, tap any row to read What to fix, Why it matters, How I'd approach it.
   Green is only for what the system verified, so these ticks stay off white: they are the learner's own word. */
import { useLayoutEffect, useRef } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useFlow } from '../../engine/store';
import type { FeedbackItem, Surface } from '../../types';
import { glideHeight, pop } from './util';

const ICON = { size: 16, strokeWidth: 1.75 };

function Item({ item }: { item: FeedbackItem }) {
  const toggle = useFlow((s) => s.actions.toggleFeedback);
  const open = useFlow((s) => s.stage?.fbOpen === item.id);
  const setFbOpen = useFlow((s) => s.actions.setFbOpen);
  const card = useRef<HTMLDivElement>(null);
  const tick = useRef<HTMLSpanElement>(null);
  const height = useRef(0);
  const was = useRef(item.checked);

  /* measure before the commit, so the row glides between its two shapes */
  useLayoutEffect(() => {
    if (was.current === item.checked) {
      height.current = card.current?.getBoundingClientRect().height ?? 0;
      return;
    }
    was.current = item.checked;
    glideHeight(card.current, height.current);
    height.current = card.current?.getBoundingClientRect().height ?? 0;
    if (item.checked) pop(tick.current, 0.4);
  }, [item.checked, open]);

  return (
    <div ref={card} className="zs2-fb" data-checked={item.checked || undefined} data-open={open || undefined}>
      <div className="zs2-fb-head">
        <button
          type="button"
          className="zs2-check"
          role="checkbox"
          aria-checked={item.checked}
          aria-label={item.one}
          onClick={() => toggle(item.id)}
        >
          {item.checked && (
            <span ref={tick} className="zs2-check-tick">
              <Check {...ICON} />
            </span>
          )}
        </button>
        <button type="button" className="zs2-fb-one" aria-expanded={open} onClick={() => setFbOpen(open ? undefined : item.id)}>
          <span>{item.one}</span>
          <ChevronDown className="zs2-fb-chev" {...ICON} />
        </button>
      </div>
      <div className="zs2-fb-fold">
        <div className="zs2-fb-fold-in">
          <dl className="zs2-fb-more">
            <div>
              <dt>What to fix</dt>
              <dd>{item.what}</dd>
            </div>
            <div>
              <dt>Why it matters</dt>
              <dd>{item.why}</dd>
            </div>
            <div>
              <dt>How I'd approach it</dt>
              <dd>{item.how}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackList({ surface }: { surface: Surface }) {
  const items = useFlow((s) => s.stage?.feedback);
  if (!items) return null;
  return (
    <div className="zs2-fblist" data-surface={surface}>
      {items.map((item) => (
        <Item key={item.id} item={item} />
      ))}
    </div>
  );
}
