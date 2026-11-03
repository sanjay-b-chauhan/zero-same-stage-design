/* The files panel when it is pinned on the left: it shows on its own once she sends a file, and you can still close it.
   Closed stays closed until you open it again from the paperclip. */
import { create } from 'zustand';

export const useSidePanel = create<{ resHidden: boolean }>(() => ({ resHidden: false }));

export const hideRes = (hidden: boolean) => useSidePanel.setState({ resHidden: hidden });
