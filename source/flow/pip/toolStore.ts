/* Which tools have their own window beside the PiP, and the click count a key uses to spring the PiP back to its view's size.
   The PiP is the origin: chat opens inside it, to-dos and resources open their own small windows. */
import { create } from 'zustand';

export type Tool = 'todos' | 'resources';

interface Tools {
  todos: boolean;
  resources: boolean;
  fitN: number; /* every key press that sizes the window counts once, so pressing the same view again still springs back */
  pulled: boolean; /* the person sized the window by hand: the key of the view they are on springs it back before it folds */
}

export const useTools = create<Tools>(() => ({ todos: false, resources: false, fitN: 0, pulled: false }));

export const setTool = (t: Tool, on: boolean) => useTools.setState({ [t]: on } as Pick<Tools, Tool>);
export const refit = () => useTools.setState((s) => ({ fitN: s.fitN + 1, pulled: false }));
export const setPulled = (pulled: boolean) => useTools.setState({ pulled });
/* b16 (his note: "resizable option should be there on every page individually"): the size you pulled each view to, for this visit.
   Pressing the key of the view you are on forgets it and springs back to the view's own size */
const pulledSizes: Partial<Record<string, { w: number; h: number }>> = {};
export const rememberSize = (view: string, s: { w: number; h: number }) => {
  pulledSizes[view] = { w: s.w, h: s.h };
};
export const pulledSize = (view: string) => pulledSizes[view];
export const forgetSize = (view: string) => {
  delete pulledSizes[view];
};
export const closeTools = () => useTools.setState({ todos: false, resources: false });
