/* Claude, in Claude's own look: the warm off-white ground, the folded sidebar, the spark, the greeting, the composer.
   You type or paste your prompt and send it. Claude thinks, then hands back what the stage's own model of Claude would:
   the cleaned file as a card. The card opens in Sheets, Download saves it so you can hand it in from the PiP. */
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  ArrowUp,
  ChevronDown,
  Clock,
  Code,
  Coffee,
  Download,
  FolderOpen,
  GraduationCap,
  MessagesSquare,
  PanelLeft,
  PenLine,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { rise } from '../../stage/parts/util';
import { askClaude, downloadLoose } from './claudeReply';
import { showInSheets, useDesk, type ClaudeMsg } from './deskStore';
import { LEARNER } from './learner';

const SPARK = 'static/logos/logo-claude.svg';
const CHIPS = [
  { label: 'Write', Icon: PenLine },
  { label: 'Learn', Icon: GraduationCap },
  { label: 'Code', Icon: Code },
  { label: 'Life stuff', Icon: Coffee },
];
const MAX_INPUT_H = 200;

const greeting = (d = new Date()) => {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

function Composer({ big }: { big: boolean }) {
  const [text, setText] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const thinking = useDesk((d) => d.thinking);
  const can = text.trim().length > 0 && !thinking;

  /* the box grows with what you write, up to a point, then it scrolls */
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(MAX_INPUT_H, el.scrollHeight)}px`;
  }, [text]);

  const send = () => {
    if (!can) return;
    askClaude(text);
    setText('');
  };
  const onKey = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="zcl-composer" data-big={big || undefined} onPointerDown={(e) => e.target === e.currentTarget && input.current?.focus()}>
      <textarea
        ref={input}
        className="zcl-input"
        rows={1}
        value={text}
        placeholder={big ? 'How can I help you today?' : 'Reply to Claude...'}
        aria-label="Write your prompt"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
      />
      <div className="zcl-composer-row">
        <button type="button" className="zcl-ghost zcl-boxed" aria-label="Add files">
          <Plus size={16} strokeWidth={1.75} />
        </button>
        <button type="button" className="zcl-ghost zcl-boxed" aria-label="Search and tools">
          <SlidersHorizontal size={16} strokeWidth={1.75} />
        </button>
        <button type="button" className="zcl-ghost zcl-boxed" aria-label="Extended thinking">
          <Clock size={16} strokeWidth={1.75} />
        </button>
        <span className="zcl-grow" />
        <button type="button" className="zcl-model">
          Opus 5.5
          <ChevronDown size={14} strokeWidth={2} />
        </button>
        <button type="button" className="zcl-send" aria-label="Send message" disabled={!can} onClick={send}>
          <ArrowUp size={16} strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}

function Msg({ m }: { m: ClaudeMsg }) {
  const el = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    rise(el.current, { y: 8, blur: 4, ms: 520 });
  }, []);
  if (m.from === 'me') {
    return (
      <div ref={el} className="zcl-me">
        <p>{m.text}</p>
      </div>
    );
  }
  const f = m.file;
  return (
    <div ref={el} className="zcl-claude">
      <p>{m.text}</p>
      {m.list && (
        <ul>
          {m.list.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      {f && (
        <div className="zcl-file">
          <button type="button" className="zcl-file-open" onClick={() => showInSheets(f.id)}>
            <img src="static/logos/f-csv.svg" alt="" draggable={false} />
            <span className="zcl-file-t">
              <span className="zcl-file-name">{f.name}</span>
              <span className="zcl-file-kind">CSV</span>
            </span>
          </button>
          <button type="button" className="zcl-file-dl" onClick={() => downloadLoose(f)}>
            <Download size={14} strokeWidth={2} />
            Download
          </button>
        </div>
      )}
      <img className="zcl-mark" src={SPARK} alt="" draggable={false} />
    </div>
  );
}

export default function ClaudeApp() {
  const msgs = useDesk((d) => d.claude);
  const thinking = useDesk((d) => d.thinking);
  const scroll = useRef<HTMLDivElement>(null);
  const empty = msgs.length === 0 && !thinking;

  /* the newest exchange stays in view */
  useEffect(() => {
    const el = scroll.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [msgs.length, thinking]);

  return (
    <div className="zcl">
      <aside className="zcl-rail" aria-label="Sidebar">
        <button type="button" className="zcl-ghost" aria-label="Open sidebar">
          <PanelLeft size={18} strokeWidth={1.75} />
        </button>
        <button type="button" className="zcl-new" aria-label="New chat">
          <Plus size={16} strokeWidth={2.25} />
        </button>
        <button type="button" className="zcl-ghost" aria-label="Chats">
          <MessagesSquare size={18} strokeWidth={1.75} />
        </button>
        <button type="button" className="zcl-ghost" aria-label="Projects">
          <FolderOpen size={18} strokeWidth={1.75} />
        </button>
        <span className="zcl-grow" />
        <span className="zcl-avatar" aria-label={LEARNER.name}>
          {LEARNER.name[0]}
        </span>
      </aside>
      <main className="zcl-main" data-empty={empty || undefined}>
        {empty ? (
          <div className="zcl-hello">
            <h1 className="zcl-greet">
              <img src={SPARK} alt="" draggable={false} />
              {greeting()}, {LEARNER.name}
            </h1>
            <Composer big />
            <div className="zcl-chips">
              {CHIPS.map(({ label, Icon }) => (
                <button key={label} type="button" className="zcl-chip">
                  <Icon size={16} strokeWidth={1.75} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div ref={scroll} className="zcl-thread">
              <div className="zcl-col">
                {msgs.map((m) => (
                  <Msg key={m.id} m={m} />
                ))}
                {thinking && (
                  <div className="zcl-thinking" aria-label="Claude is thinking">
                    <img src={SPARK} alt="" draggable={false} />
                  </div>
                )}
              </div>
            </div>
            <div className="zcl-foot">
              <Composer big={false} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
