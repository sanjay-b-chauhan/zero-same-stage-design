/* Where you talk to her. A two row box like ChatGPT, the same on the big screen and in the PIP: the words on top, then Plus,
   your screen and the I'm stuck switch on the left, the mic and send on the right. The PIP is the same box, scaled down.
   While you hold to talk it becomes the live mic slab, same size, so nothing around it moves. Hold Space still talks, with no
   hint printed for it. The box sits on surface 2 with no outline, or an outline when the dev toggle says so. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, Fullscreen, Mic, Plus } from 'lucide-react';
import VoiceBeam from 'voice-glow';
import { softClick } from '../../audio';
import { clock } from '../../clock';
import { useFlow } from '../../engine/store';
import type { Surface } from '../../types';
import { useDraft } from './draft';
import { grabFrame } from './grabFrame';
import Heard from './Heard';
import MicBars from './MicBars';
import { canTalk, holdProps } from './useHold';
import { firstName, land, mss, openKeyCount, rise } from './util';

const ICON = { size: 16, strokeWidth: 1.75 };

export function HeldClock() {
  const at = useDraft((s) => s.holdAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = clock.setInterval(() => setNow(Date.now()), 200);
    return () => clock.clearInterval(id);
  }, []);
  return <span className="zs2-heldclock z-num">{mss(Math.max(0, now - at))}</span>;
}

/* the textarea grows with what you write, up to six lines */
function useAutoSize(el: React.RefObject<HTMLTextAreaElement | null>, text: string) {
  useLayoutEffect(() => {
    const t = el.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = `${Math.min(t.scrollHeight, 132)}px`;
  }, [el, text]);
}

export default function Composer({ surface }: { surface: Surface }) {
  const text = useDraft((s) => s.text);
  const setDraft = useDraft((s) => s.set);
  const listening = useFlow((s) => s.ui.listening);
  const light = useFlow((s) => s.ui.lightStage);
  const stuckMode = useFlow((s) => s.stage?.stuckMode ?? false);
  /* b14 stuck mode: the composer is the key after her pills, so it carries the next number (his words: "option 4 ... is
     nothing but the chat thing") */
  const keysOpen = useFlow((s) => (s.stage?.stuckMode ? openKeyCount(s.stage.msgs) : 0));
  const optNum = useRef<HTMLSpanElement>(null);
  const repeat = useDraft((s) => s.repeat);
  const name = useFlow((s) => firstName(s.project?.manager.name ?? ''));
  const a = useFlow((s) => s.actions);
  const input = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const slab = useRef<HTMLDivElement>(null);
  const speech = canTalk();
  const has = text.trim().length > 0;
  const big = surface === 'big';
  const [shooting, setShooting] = useState(false);

  useAutoSize(input, text);

  useEffect(() => {
    if (listening) rise(slab.current, { y: 0, scale: 0.985, blur: 4, ms: 360 });
  }, [listening]);

  /* the number lands with her pills, small and soft to sharp */
  const hadKeys = useRef(keysOpen > 0);
  useLayoutEffect(() => {
    const had = hadKeys.current;
    hadKeys.current = keysOpen > 0;
    if (keysOpen > 0 && !had) land(optNum.current, 0.5, 120, 3);
  }, [keysOpen]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    softClick();
    a.send(t);
    setDraft({ text: '', repeat: false });
    input.current?.focus();
  };

  const shoot = async () => {
    if (shooting) return;
    setShooting(true);
    const shot = await grabFrame(input.current);
    setShooting(false);
    if (shot) a.sendShot(shot);
  };

  const off = listening ? -1 : 0;
  const tools = (
    <>
      <button type="button" className="zs2-ghost" aria-label="Attach a file" title="Attach a file" tabIndex={off} onClick={() => picker.current?.click()}>
        <Plus {...ICON} />
      </button>
      <button
        type="button"
        className="zs2-ghost"
        aria-label="Send her your screen"
        title="Send her your screen"
        tabIndex={off}
        disabled={shooting}
        onClick={() => void shoot()}
      >
        <Fullscreen {...ICON} />
      </button>
    </>
  );
  /* b13 (his note, 2 Nov: "Toggle means like those radio buttons ... it moves like a toggle thing"): a real switch, the
     knob slides. On, the whole stage turns to stuck mode. The words are its label, so a click on them flips it too */
  const stuckKey = (
    <label className="zs2-stuckkey" data-on={stuckMode || undefined}>
      <span>I'm stuck</span>
      <button
        type="button"
        className="zk-tg"
        role="switch"
        aria-checked={stuckMode}
        tabIndex={off}
        onClick={() => {
          softClick();
          a.stuckMode();
        }}
      />
    </label>
  );
  /* the mic and send sit side by side. Send stays quiet until there is something to send */
  const talk = (
    <span className="zs2-talk">
      {speech && (
        <button type="button" className="zs2-ghost" aria-label="Hold to talk" title="Hold Space to talk" tabIndex={off} {...holdProps()}>
          <Mic {...ICON} />
        </button>
      )}
      <button type="button" className="zs2-send" aria-label="Send" disabled={!has} tabIndex={has && !listening ? 0 : -1} onClick={submit}>
        <ArrowUp {...ICON} />
      </button>
    </span>
  );
  const field = (
    <textarea
      ref={input}
      className="zs2-input"
      rows={1}
      value={text}
      placeholder={repeat ? "Didn't catch that. Say it again" : keysOpen ? 'Or say it your way' : `Ask ${name}`}
      tabIndex={off}
      onChange={(e) => {
        setDraft({ text: e.target.value });
        a.noteTyping();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submit();
        }
      }}
    />
  );

  /* b14 (his note: a flat line and 0:04 "reads as dead"): the slab is alive. Your words land as you say them, the bars move
     with your voice, the clock runs. The words take the top row and the mic the bottom one, like the box. The PiP is the same
     slab a size down */
  const micSlab = listening && (
    <div ref={slab} className="zs2-micslab" data-heard="" data-big={big || undefined}>
      <Heard wrap className="zs2-heard" />
      <div className="zs2-micslab-row">
        <Mic {...ICON} size={big ? 16 : 14} />
        <MicBars bars={big ? 56 : 30} />
        <HeldClock />
      </div>
    </div>
  );

  const box = (
    <div className="zs2-composer-box" data-optnum={keysOpen > 0 || undefined}>
      {keysOpen > 0 && (
        <span ref={optNum} className="zs2-optnum z-num" aria-hidden>
          {keysOpen + 1}
        </span>
      )}
      {field}
      <div className="zs2-composer-bar">
        <span className="zs2-composer-l">
          {tools}
          {stuckKey}
        </span>
        <span className="zs2-composer-r">{talk}</span>
      </div>
      {micSlab}
    </div>
  );

  return (
    <div className="zs2-composer" data-surface={surface} data-listening={listening || undefined}>
      <input
        ref={picker}
        type="file"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) a.attachFile(f);
          e.target.value = '';
        }}
      />
      {big ? (
        <VoiceBeam
          className="zs2-composer-beam"
          type="default"
          colorVariant="mono"
          theme={light ? 'light' : 'dark'}
          active={listening}
          level={() => useFlow.getState().ui.micLevel}
          borderRadius={14}
        >
          {box}
        </VoiceBeam>
      ) : (
        box
      )}
    </div>
  );
}
