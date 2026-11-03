/* Puts the quiet lines into the PiP chat, above the answers they belong to, without touching the shared thread.
   Each row carries its message id (data-mid), so a line only ever sits over its own answer.
   The stage can drop SeenLine into its own rows later and this goes away. */
import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useFlow } from '../engine/store';
import { useDraft } from '../stage/parts/draft';
import { firstName } from '../stage/parts/util';
import type { Msg } from '../types';
import { fillsOf, useReactions } from '../stage/parts/reactions';
import { seenLines, useSeen } from './seen';
import SeenLine from './SeenLine';

const EMPTY: Msg[] = [];
const HOST = 'zp-seen-host';

interface Placed {
  id: string;
  el: HTMLElement;
}

const same = (a: Placed[], b: Placed[]) => a.length === b.length && a.every((x, i) => x.id === b[i].id && x.el === b[i].el);

export default function SeenLayer({ host }: { host: RefObject<HTMLElement | null> }) {
  const msgs = useFlow((s) => s.stage?.msgs ?? EMPTY);
  const phase = useFlow((s) => s.stage?.phase ?? 'work');
  const manager = useFlow((s) => firstName(s.project?.manager.name ?? 'her'));
  const pouFrom = useDraft((s) => s.pouFrom);
  const frames = useSeen((s) => s.frames);
  const sent = useSeen((s) => s.sent);
  const reactions = useReactions();
  const fills = useMemo(() => fillsOf(reactions), [reactions]);

  /* the room hides the older rows, so a line only goes where its row is drawn */
  const room = phase === 'pou' || phase === 'done';
  const visible = useMemo(() => (room ? (pouFrom > 0 ? msgs.slice(pouFrom) : msgs.slice(-2)) : msgs), [msgs, room, pouFrom]);
  const lines = useMemo(() => seenLines(msgs, frames, sent, manager, fills), [msgs, frames, sent, manager, fills]);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const latest = useRef({ lines });
  latest.current = { lines };

  useLayoutEffect(() => {
    const col = host.current?.querySelector<HTMLElement>('.zs2-thread-col');
    if (!col) return;
    const place = () => {
      const { lines: want } = latest.current;
      const next: Placed[] = [];
      col.querySelectorAll<HTMLElement>('.zs2-row[data-mid]').forEach((row) => {
        const id = row.dataset.mid ?? '';
        let box = row.firstElementChild?.classList.contains(HOST) ? (row.firstElementChild as HTMLElement) : null;
        if (!want.has(id) || row.dataset.from !== 'her') {
          box?.remove();
          return;
        }
        if (!box || box.dataset.msg !== id) {
          box?.remove();
          box = row.ownerDocument.createElement('div');
          box.className = HOST;
          box.dataset.msg = id;
          row.prepend(box);
        }
        next.push({ id, el: box });
      });
      setPlaced((prev) => (same(prev, next) ? prev : next));
    };
    place();
    const View = col.ownerDocument.defaultView as (Window & typeof globalThis) | null;
    const MO = View?.MutationObserver ?? MutationObserver;
    const mo = new MO(() => place());
    mo.observe(col, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [host, visible, lines]);

  return (
    <>
      {placed.map((p) => {
        const items = lines.get(p.id);
        return items ? createPortal(<SeenLine id={p.id} items={items} />, p.el, p.id) : null;
      })}
    </>
  );
}
