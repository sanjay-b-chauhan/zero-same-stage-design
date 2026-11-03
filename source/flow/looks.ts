/* The look, set from developer mode with plain toggles (his note, 2 Nov: "a toggle, literally a toggle").
   Saved per browser and written onto <html> as data attributes, so any screen's CSS follows without importing this.
   style: the light pages. 1 blue grey (b36's paper and navy ink), 2 white with neutral greys, 3 a grey ground with
   white surfaces on it. slotOutline: the stage's left panel keeps its outline. chatSurface: the stage's chat box sits on
   surface 2 instead of an outline. The stage's own light or dark stays in the flow store (ui.lightStage). */
import { create } from 'zustand';

export type LookStyle = 1 | 2 | 3;

export interface Looks {
  style: LookStyle;
  slotOutline: boolean;
  chatSurface: boolean;
}

const KEY = 'zero-stage-looks';
const DEFAULTS: Looks = { style: 1, slotOutline: false, chatSurface: true };

const read = (): Looks => {
  let saved: Partial<Looks> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    saved = {};
  }
  const asked = Number(new URLSearchParams(location.search).get('look'));
  const looks = { ...DEFAULTS, ...saved };
  if (asked === 1 || asked === 2 || asked === 3) looks.style = asked;
  return looks;
};

export const useLooks = create<Looks>(() => read());

const paint = (l: Looks) => {
  const d = document.documentElement.dataset;
  d.lookStyle = String(l.style);
  d.slotOutline = l.slotOutline ? '1' : '0';
  d.chatSurface = l.chatSurface ? '1' : '0';
};

paint(useLooks.getState());

export const setLook = (p: Partial<Looks>) => {
  useLooks.setState(p);
  const l = useLooks.getState();
  paint(l);
  try {
    localStorage.setItem(KEY, JSON.stringify(l));
  } catch {
    /* it still works for this visit */
  }
};
