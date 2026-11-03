import type { Msg } from '../room/talk';

export interface CheckGroup {
  from: Msg['from'];
  key: number;
  msgs: Msg[];
}

/* her lines back to back read as one message, the way a person types; yours stay one per answer */
export function groupBySpeaker(thread: Msg[]): CheckGroup[] {
  const out: CheckGroup[] = [];
  for (const m of thread) {
    const last = out[out.length - 1];
    if (last && m.from === 'her' && last.from === 'her') last.msgs.push(m);
    else out.push({ from: m.from, key: m.id, msgs: [m] });
  }
  return out;
}

/* the words of one line that are out so far, while her voice says it */
export function shownWords(m: Msg, stream: { id: number; n: number } | null): string {
  const text = m.text ?? '';
  if (!stream || stream.id !== m.id) return text;
  return text.split(/\s+/).filter(Boolean).slice(0, stream.n).join(' ');
}
