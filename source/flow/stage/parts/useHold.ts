/* Hold to talk. One controller for the whole page: Space or Option+Space, or a held button, in either document.
   b14 (his note, 2 Nov: "no real functiaonlity please lets fake it untill we make it"): no microphone, no recognition, no
   recorder, nothing the browser asks you about. A hold is the same talk as the PiP's keys (pip/talk.ts): she hears the question
   that fits where you are, or your answer in the POU, and answers it. A tap works too: it sends itself when you finish. */
import { useEffect, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { talkCancel, talkPress, talkRelease, talking } from '../../pip/talk';
import { isTextEntry } from './util';

/* The kickoff room (room/hold.ts) still asks whether this browser has speech. Nothing on the stage does any more */
export const hasSpeech = (): boolean => {
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return !!(w.SpeechRecognition ?? w.webkitSpeechRecognition);
};

/* talking needs nothing from the browser now, so the mic shows everywhere */
export const canTalk = (): boolean => true;

/* true only after Tab. :focus-visible can't tell: Chrome flips it on any keypress, so a clicked button would eat the hold */
let tabbing = false;

export function holdStart(): void {
  talkPress();
}

export function holdEnd(): void {
  talkRelease();
}

export function holdCancel(): void {
  talkCancel();
}

/* Spread on any button that should talk while it is held. Works in either document. */
export function holdProps() {
  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      holdStart();
      const doc = e.currentTarget.ownerDocument;
      const up = () => {
        doc.removeEventListener('pointerup', up);
        doc.removeEventListener('pointercancel', cancel);
        holdEnd();
      };
      const cancel = () => {
        doc.removeEventListener('pointerup', up);
        doc.removeEventListener('pointercancel', cancel);
        holdCancel();
      };
      doc.addEventListener('pointerup', up);
      doc.addEventListener('pointercancel', cancel);
    },
  };
}

/* Call once per document, with a ref to any element inside it. */
export function useHold(host: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const doc = el.ownerDocument;
    const view = doc.defaultView;
    let viaSpace = false;

    const onPointer = () => {
      tabbing = false;
    };
    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') tabbing = true;
      if (e.code === 'Escape' && talking()) {
        e.preventDefault();
        e.stopPropagation();
        viaSpace = false;
        holdCancel();
        return;
      }
      if (e.code !== 'Space' || e.ctrlKey || e.metaKey) return;
      const anywhere = e.altKey;
      if (!anywhere && isTextEntry(e.target)) return;
      /* a button reached with the keyboard keeps its normal Space */
      const t = e.target as HTMLElement | null;
      if (!anywhere && t?.tagName === 'BUTTON' && tabbing) return;
      e.preventDefault();
      if (e.repeat) return;
      viaSpace = true;
      holdStart();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== 'Alt') return;
      if (!viaSpace) return;
      if (e.key === 'Alt' && !talking()) return;
      viaSpace = false;
      e.preventDefault();
      holdEnd();
    };
    const onBlur = () => {
      if (viaSpace) {
        viaSpace = false;
        holdCancel();
      }
    };
    doc.addEventListener('pointerdown', onPointer, true);
    doc.addEventListener('keydown', onDown);
    doc.addEventListener('keyup', onUp);
    view?.addEventListener('blur', onBlur);
    return () => {
      doc.removeEventListener('pointerdown', onPointer, true);
      doc.removeEventListener('keydown', onDown);
      doc.removeEventListener('keyup', onUp);
      view?.removeEventListener('blur', onBlur);
    };
  }, [host]);
}
