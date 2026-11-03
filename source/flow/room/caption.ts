/* Her one caption line. Whoever is speaking sets it, the Room draws it. */
import { create } from 'zustand';

export const useCaption = create<{ text: string | null }>(() => ({ text: null }));

export const setCaption = (text: string | null) => useCaption.setState({ text });
