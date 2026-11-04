/* The level and the coach, one pill top right, as zero-coach-levels b53 shows it on dark, in b36's tokens. Shown on the
   world map, the meeting and its check-in (b11, his ask), the plan and the stage; hidden in the stage POU. Click Level or his face: a sheet
   grows out of the pill. One open at a time, Esc or a click outside closes it, and it goes back the way it came.
   Dark on the map and the stage, light on the light plan pages, so it takes the ground it sits on.
   Open, it is the product's own panel: the real tabs and the real Level and Coach panels (realData.ts feeds them),
   in the real skin, width and zoom. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { usePillCopy } from '@/renderer/features/coachLevels/source/usePillCopy';
import { usePanelStore } from '@/renderer/features/coachLevels/state/panelStore';
import { PanelSection } from '@/renderer/features/coachLevels/ui/pill/PanelSection';
import { PANEL_SKIN } from '@/renderer/features/coachLevels/ui/pill/panelSkin';
import { PillTabs } from '@/renderer/features/coachLevels/ui/pill/PillTabs';
import { PANEL_BOX, PANEL_WIDTH, PILL_BOX } from '@/renderer/features/coachLevels/ui/pill/pillTheme';
import { fitZoom } from '@/renderer/features/coachLevels/ui/scale/surfaceZoom';
import { useSurfaceZoom } from '@/renderer/features/coachLevels/ui/scale/useSurfaceZoom';
import { PANEL_TABS, type PanelTab } from '@/renderer/features/coachLevels/vocab/panelViews';
import { softClick } from '../audio';
import { useFlow } from '../engine/store';
import type { Screen } from '../types';
import { prefersReduced, SNAP, SNAP_MS } from '../stage/parts/util';
import { useHudAnchor } from './anchor';
import { COACH } from './coach';
import { asset, Badge, Bar, badgeSrc, fmt, Roll, useReadout } from './parts';
import LevelBurst from './LevelBurst';
import { closeHud, toggleHud, type HudTab, type PanelSnap } from './open';
import { hudQueryClient, seedHud, startHudData } from './realData';
import { intoLevel, levelOf, PER_LEVEL, setHudBadge, useXp, XP_START } from './xp';
import './hud.css';
import './real.css';

const TABS: readonly PanelTab[] = [PANEL_TABS.LEVEL, PANEL_TABS.COACH];
const TABS_PAD_TOP = 8; /* PANEL_BOX.tabsPad, '8px 8px 0' */
const EDGE = 26; /* the pill's right inset, kept on both sides when the panel is zoomed to fit */
/* b28 (his note: "decrease the size of the Level and the Coach ... around 20% smaller") */
const SMALL = 0.8;
/* b39 (his note: "It's too small ... the scaling was for the bigger screen"): 20% smaller only ever trims the big screen.
   On a laptop (about 1512 by 800) the product's zoom times 0.8 came to 0.67, so its 13px text read at 9px. The open panel
   now holds between 0.94 and 1.1: about its real size on the laptop, a touch bigger on the 2560 monitor */
const ZOOM_MIN = 0.94;
const ZOOM_MAX = 1.1;
const FOOT = 16; /* room under the open panel */

/* the real panels read the product's stores; they are filled before anything mounts, so no query ever starts */
startHudData();

const SHOWN: ReadonlySet<Screen> = new Set<Screen>(['world', 'kickoff', 'pou', 'breakdown', 'objective', 'stage']);
const LIGHT: ReadonlySet<Screen> = new Set<Screen>(['kickoff', 'pou', 'breakdown', 'objective']);
const OUT = 'cubic-bezier(.2,0,0,1)';

/* the badge takes the coin: one bump */
const bump = (el: Element | null) => {
  if (!el || prefersReduced(el)) return;
  el.animate(
    [{ transform: 'none' }, { transform: 'scale(1.22) rotate(-8deg)', offset: 0.3 }, { transform: 'none' }],
    { duration: 620, easing: OUT }
  );
};

export default function Hud() {
  const screen = useFlow((s) => s.screen);
  const phase = useFlow((s) => s.stage?.phase);
  const shown = useXp((s) => s.shown);
  const total = useXp((s) => s.total);
  const gain = useXp((s) => s.gain);
  const up = useXp((s) => s.up);

  const [ready, setReady] = useState(false);
  const on = ready && SHOWN.has(screen) && !(screen === 'stage' && phase === 'pou');
  const L = levelOf(shown);
  const toNext = Math.max(0, L * PER_LEVEL - shown);
  const xp = useReadout(gain);

  const open = usePanelStore((s: PanelSnap) => s.open);
  const tab = usePanelStore((s: PanelSnap) => s.tab);
  const view = usePanelStore((s: PanelSnap) => s.view);
  const setTab = usePanelStore((s: PanelSnap) => s.setTab);
  const copy = usePillCopy().data;
  const screenSize = useSurfaceZoom();
  const panelW = PANEL_WIDTH[view];
  const zoom = fitZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, screenSize.zoom * SMALL)), panelW, screenSize.width - 2 * EDGE);
  const skin = PANEL_SKIN[tab];
  const tabsH = (TABS_PAD_TOP + PANEL_BOX.tabHeight) * zoom;
  const [top, setTop] = useState(24);
  const [closedW, setClosedW] = useState(0);
  const [bodyH, setBodyH] = useState(0);
  const [burst, setBurst] = useState(0);

  const root = useRef<HTMLDivElement>(null);
  const slab = useRef<HTMLDivElement>(null);
  const closed = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const badge = useRef<HTMLSpanElement>(null);
  const seenUp = useRef(up?.n ?? 0);
  const lastGain = useRef(gain);
  const lastL = useRef(L);

  /* the closed width is the pill's own; the sheet is 432 */
  useLayoutEffect(() => {
    const el = closed.current;
    if (!el) return;
    const measure = () => setClosedW(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const measure = () => setBodyH(Math.ceil(el.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* on a page with a [data-hud-anchor] box the pill sits on it, else in the viewport corner */
  useHudAnchor(root, `${screen}:${phase ?? ''}`);

  /* it rises in after the first paint, never just there */
  useEffect(() => setReady(true), []);

  /* the open panel never runs past the bottom of the screen: it scrolls inside, as the real one does */
  useLayoutEffect(() => {
    if (!open) return;
    seedHud();
    const t = root.current?.getBoundingClientRect().top;
    if (t !== undefined) setTop(t);
  }, [open, screenSize.height, screenSize.width, screen]);
  const maxH = Math.max(120, (screenSize.height - top - tabsH - FOOT) / zoom);

  /* the badges load once, so a level up never waits on an image */
  useEffect(() => {
    for (let k = 1; k <= 3; k++) new Image().src = badgeSrc(k);
  }, []);

  /* the coin lands in this badge while the pill is on screen */
  useEffect(() => {
    setHudBadge(on ? badge.current : null);
    return () => setHudBadge(null);
  }, [on]);

  useEffect(() => {
    if (on) return;
    closeHud();
  }, [on]);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) closeHud();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeHud();
    };
    document.addEventListener('pointerdown', down, true);
    window.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      window.removeEventListener('keydown', key);
    };
  }, [open]);

  /* a coin landed: the badge bumps once */
  useEffect(() => {
    if (gain > lastGain.current && on) bump(badge.current);
    lastGain.current = gain;
  }, [gain, on]);

  /* a new level: the badge swaps on a spring and the pill bumps once */
  useEffect(() => {
    if (L === lastL.current) return;
    const rose = L > lastL.current;
    lastL.current = L;
    if (!rose || !on) return;
    const b = badge.current;
    if (b && !prefersReduced(b)) {
      b.animate(
        [
          { transform: 'scale(.4) rotate(-24deg)', filter: 'blur(4px)' },
          { transform: 'none', filter: 'blur(0px)' },
        ],
        { duration: SNAP_MS, easing: SNAP }
      );
      slab.current?.animate(
        [{ transform: 'none' }, { transform: 'scale(1.06)', offset: 0.35 }, { transform: 'none' }],
        { duration: 560, easing: OUT }
      );
    }
  }, [L, on]);

  /* b17: a level reached takes the whole screen, the job portal's own celebration, once per level */
  useEffect(() => {
    if (!up) {
      seenUp.current = 0;
      return;
    }
    if (up.n === seenUp.current) return;
    seenUp.current = up.n;
    setBurst(up.level);
  }, [up]);

  const toggle = (t: HudTab) => {
    softClick();
    toggleHud(t);
  };
  const pick = (t: PanelTab) => {
    softClick();
    setTab(t);
  };

  const slabStyle = !closedW
    ? undefined
    : open
      ? {
          width: panelW * zoom,
          borderRadius: PILL_BOX.radius * zoom,
          background: skin.bg,
          boxShadow: skin.shadow,
          backdropFilter: skin.blur,
          WebkitBackdropFilter: skin.blur,
        }
      : { width: closedW };

  return (
    <div
      ref={root}
      className={LIGHT.has(screen) ? 'zh' : 'zh zd'}
      data-on={on || undefined}
      data-open={open || undefined}
      aria-hidden={!on || undefined}
    >
      <div ref={slab} className="zh-slab" style={slabStyle}>
        <div className="zh-head" style={open ? { height: tabsH } : undefined}>
          <div ref={closed} className="zh-closed">
            <button
              type="button"
              className="zh-seg zh-lv"
              tabIndex={open ? -1 : 0}
              aria-expanded={open && tab === 'level'}
              aria-label={`Level ${L}, ${fmt(shown)} XP${L < 10 ? `, ${fmt(toNext)} XP to Level ${L + 1}` : ''}`}
              onClick={() => toggle('level')}
            >
              <span ref={badge} className="zh-bdgw" data-xp-badge="">
                <Badge level={L} size={22} />
              </span>
              <span className="zh-tx">
                <Roll level={L} shown={shown} total={total} xp={xp} />
                <Bar p={intoLevel(shown)} />
              </span>
            </button>
            <i className="zh-sep" aria-hidden="true" />
            <button
              type="button"
              className="zh-seg zh-co"
              tabIndex={open ? -1 : 0}
              aria-expanded={open && tab === 'coach'}
              aria-label={`${COACH.role}, ${COACH.name}`}
              onClick={() => toggle('coach')}
            >
              <img className="zh-face" src={asset(COACH.face)} alt="" draggable={false} />
            </button>
          </div>
          {copy && (
            <div className="zh-rtabs zh-real" style={{ width: panelW, zoom }} inert={!open}>
              <PillTabs tabs={TABS} current={tab} skin={skin} copy={copy} onPick={pick} />
            </div>
          )}
        </div>
        <div className="zh-body" style={{ height: open ? bodyH : 0 }} inert={!open}>
          <div ref={inner} className="zh-in zh-real" style={{ width: panelW, zoom }}>
            <QueryClientProvider client={hudQueryClient}>
              <PanelSection open={open} tab={tab} solo={false} label={copy?.aria.panel ?? ''} maxHeight={maxH} />
            </QueryClientProvider>
          </div>
        </div>
      </div>
      {burst > 0 && <LevelBurst key={burst} level={burst} gain={useXp.getState().total - XP_START} onDone={() => setBurst(0)} />}
    </div>
  );
}
