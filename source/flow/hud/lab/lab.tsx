/* HUD lab, test only, never in the app build. The real Hud, the real gear and the real XpChip on three grounds:
   ?bg=world (the map), ?bg=light (a Room sheet), ?bg=dark (the charcoal stage with a stand-in PiP window, an iframe
   dressed the way usePipWindow dresses the real one, holding the real XpChip). */
import '../../ds/zero-jobs.css';
import '../../ds/tokens.css';
import '../../theme.css';
import '../../ds/b36.css';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import DevMode from '../../dev/DevMode';
import { useDev } from '../../dev/store';
import { useFlow } from '../../engine/store';
import { Hud, XpChip } from '..';

const qs = new URLSearchParams(location.search);
const bg = qs.get('bg') ?? 'world';
/* ?anchor=1: a stand-in stage top row, capped at 1732 and centred like the stage frame, with the box the stage owner
   reserves for the pill at its right end, centred on y 35 like the stage row. ?anchor=late adds it after 1.5 s */
const anchorMode = qs.get('anchor');
Object.assign(window, { __dev: useDev, __flowLab: useFlow });
if (bg === 'dark') useFlow.setState({ screen: 'stage' });
else if (bg === 'light') useFlow.setState({ screen: 'objective' });

const box = (s: CSSProperties): CSSProperties => s;

function FakePip() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const d = frame.current?.contentDocument;
    if (!d) return;
    const base = d.createElement('base');
    base.href = document.baseURI;
    d.head.appendChild(base);
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => d.head.appendChild(d.importNode(n, true)));
    d.documentElement.className = document.documentElement.className;
    d.documentElement.dataset.zstyle = document.documentElement.dataset.zstyle ?? 'voice';
    d.body.style.cssText = 'margin:0;height:100%;overflow:hidden;background:#141414';
    const m = d.createElement('div');
    d.body.appendChild(m);
    setMount(m);
  }, []);
  return (
    <>
      <iframe ref={frame} id="pip" title="pip" style={box({ position: 'fixed', right: 24, bottom: 24, width: 380, height: 300, border: 0, borderRadius: 16, boxShadow: '0 0 0 1px rgba(255,255,255,.12)' })} />
      {mount &&
        createPortal(
          <div className="z-root zj zd" style={box({ height: '100vh', background: 'var(--zj-canvas)', color: 'var(--zj-ink)' })}>
            <div style={box({ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 0 14px', boxShadow: '0 1px 0 var(--zj-line)' })}>
              <span style={box({ color: 'var(--zj-ink)' })}>Clean the data</span>
              <XpChip />
            </div>
            <div style={box({ padding: 14, display: 'grid', gap: 8 })}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} data-pipslot={i} style={box({ height: 36, borderRadius: 10, background: 'var(--zj-well)' })} />
              ))}
            </div>
          </div>,
          mount
        )}
    </>
  );
}

function AnchorRow() {
  const [on, setOn] = useState(anchorMode === '1');
  useEffect(() => {
    Object.assign(window, { __anchor: setOn });
    if (anchorMode !== 'late') return;
    const t = setTimeout(() => setOn(true), 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div id="lab-row" style={box({ position: 'fixed', top: 13, left: 14, right: 14, maxWidth: 1732, margin: '0 auto', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, color: 'var(--b-t2)', boxShadow: 'inset 0 -1px 0 var(--b-hl)' })}>
      <span style={box({ marginRight: 'auto', paddingLeft: 10, color: 'var(--b-t1)' })}>Stage frame</span>
      <span>14:54</span>
      {on && <span id="lab-anchor" data-hud-anchor="" style={box({ width: 160, height: 44, borderRadius: 22, boxShadow: 'inset 0 0 0 1px var(--b-ok)' })} />}
    </div>
  );
}

function Ground() {
  if (bg === 'world')
    return <img alt="" src="static/world/world.webp" style={box({ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' })} />;
  if (bg === 'light')
    return (
      <div style={box({ position: 'fixed', inset: 0, background: 'var(--zj-canvas)' })}>
        <div style={box({ position: 'fixed', inset: 14, background: 'var(--zj-sheet)', borderRadius: 28, boxShadow: 'var(--zj-sh-sheet)' })}>
          <div style={box({ height: 56, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', color: 'var(--zj-ink)', fontWeight: 500 })}>
            <span className="zj-round" style={box({ boxShadow: 'var(--zj-sh-ctl)' })} />
            Find where Spotify can raise prices next
          </div>
          <div style={box({ maxWidth: 688, margin: '40px auto', display: 'grid', gap: 8 })}>
            {['Clean the data', 'Revenue model', 'Pricing tests', 'Recommendation', 'Present'].map((t, i) => (
              <div key={t} data-row={i} style={box({ height: 56, borderRadius: 14, boxShadow: 'var(--zj-sh-ring)', display: 'flex', alignItems: 'center', padding: '0 16px', color: 'var(--zj-ink)' })}>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  return (
    <div className="zd" style={box({ position: 'fixed', inset: 0, background: 'var(--zj-canvas)', color: 'var(--zj-ink)' })}>
      <div style={box({ height: 56, margin: '14px 14px 0', display: 'flex', alignItems: 'center', padding: '0 4px', gap: 10 })}>Clean the data</div>
      <div style={box({ margin: '0 14px', display: 'grid', gridTemplateColumns: 'repeat(2, 220px)', gap: 8, padding: 20, width: 500, borderRadius: 20, background: 'var(--zj-sheet)' })}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} data-slot={`i${i}`} style={box({ height: 40, borderRadius: 10, background: 'var(--zj-well)' })} />
        ))}
      </div>
      {anchorMode && <AnchorRow />}
      <FakePip />
    </div>
  );
}

function Lab() {
  return (
    <>
      <div className="z-root zj" style={box({ position: 'fixed', inset: 0, background: 'transparent' })}>
        <Ground />
        <Hud />
      </div>
      <DevMode />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Lab />);
