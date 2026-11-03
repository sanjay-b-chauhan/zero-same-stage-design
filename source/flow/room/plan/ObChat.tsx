/* b18 (his note, 3 Nov: "all the chatting thing happens on the left-hand side"): her breakdown, said on this page as chat.
   Her words come from the top as she says them, soft and green, then ink. Yours sit on the right. The box under them is
   an outline: ask her anything about the plan, she answers from the plan itself (obReplies.ts). */
import { ArrowUp } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

export interface ObMsg {
  id: string;
  from: 'her' | 'me';
  text: string;
  fresh?: boolean;
}

const Words = ({ text }: { text: string }) => (
  <>
    {text.split(/(\s+)/).map((w, i) =>
      /^\s+$/.test(w) ? (
        w
      ) : (
        <span key={i} className="obc-w" style={{ '--i': i / 2 } as CSSProperties}>
          {w}
        </span>
      )
    )}
  </>
);

export default function ObChat({ msgs, name, onSend }: { msgs: ObMsg[]; name: string; onSend: (text: string) => void }) {
  const list = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');

  useLayoutEffect(() => {
    const el = list.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: msgs.length > 1 ? 'smooth' : 'auto' });
  }, [msgs.length]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    onSend(t);
  };

  return (
    <div className="obc">
      <div ref={list} className="obc-list" aria-live="polite">
        {msgs.map((m) => (
          <p key={m.id} className="obc-m" data-from={m.from} data-fresh={m.fresh ? '1' : undefined}>
            {m.from === 'her' && m.fresh ? <Words text={m.text} /> : m.text}
          </p>
        ))}
      </div>
      <form
        className="obc-box"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
            e.preventDefault();
            send();
          }}
          placeholder={`Ask ${name}`} aria-label={`Ask ${name}`} />
        <button type="submit" className="obc-send" aria-label="Send" disabled={!text.trim()}>
          <ArrowUp size={16} strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}
