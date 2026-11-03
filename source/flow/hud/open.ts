/* Which panel is open lives in the real panel store, the one the real tabs, rows and See more details already
   write to. A fresh open always starts on the brief; a close keeps the view, so the panel goes back the way it came. */
import { usePanelStore } from '@/renderer/features/coachLevels/state/panelStore';
import { PANEL_VIEWS } from '@/renderer/features/coachLevels/vocab/panelViews';
import { seedHud } from './realData';

export type HudTab = 'level' | 'coach';
export type PanelSnap = ReturnType<typeof usePanelStore.getState>;

/* opens the HUD panel on that tab, from anywhere in the flow */
export function openHud(tab: HudTab): void {
  seedHud();
  usePanelStore.setState({ open: true, tab, view: PANEL_VIEWS.BRIEF, detailLevel: null, openRow: null });
}

export function closeHud(): void {
  usePanelStore.setState({ open: false });
}

/* the pill: the same tab again closes, the other one switches */
export function toggleHud(tab: HudTab): void {
  const s = usePanelStore.getState();
  if (s.open && s.tab === tab) closeHud();
  else if (s.open) s.setTab(tab);
  else openHud(tab);
}

/* test rail, nothing on screen: window.__hud.open('level') */
(window as unknown as { __hud?: { open: typeof openHud; close: typeof closeHud } }).__hud = { open: openHud, close: closeHud };
