/* The film lab: the film in a stand-in of the Room's light chrome, on a clock of its own. Dev only, delete before ship.
   ?p=spotify&seg=1&t=12&g=slab   window.__lab: set(p, seg, t), play(p, seg, t0, rate), stop(), cues(p, seg), dur(p), get() */
import '../../../ds/zero-jobs.css';
import '../../../ds/tokens.css';
import '../../../theme.css';
import '../../../ds/b36.css';

import { createRoot } from 'react-dom/client';
import { create } from 'zustand';
import { AMAZON } from '../../../data/amazon';
import { SPOTIFY } from '../../../data/spotify';
import type { ProjectId } from '../../../types';
import { runOf } from '../../run';
import Film, { cuesFor } from '../Film';

interface LabState {
  p: ProjectId;
  seg: number;
  t: number;
}
const q = new URLSearchParams(location.search);
const P0: ProjectId = q.get('p') === 'amazon' ? 'amazon' : 'spotify';
const useLab = create<LabState>(() => ({ p: P0, seg: Number(q.get('seg') ?? 0) || 0, t: Number(q.get('t') ?? 0) || 0 }));
const durs = (p: ProjectId) => runOf(p).segments.map((s) => s.audio_duration_sec);

let raf = 0;
const stop = () => {
  cancelAnimationFrame(raf);
  raf = 0;
};
const lab = {
  set(p: ProjectId, seg: number, t: number) {
    stop();
    useLab.setState({ p, seg, t });
  },
  play(p: ProjectId, seg: number, t0 = 0, rate = 1) {
    stop();
    useLab.setState({ p, seg, t: t0 });
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000) * rate;
      last = now;
      const s = useLab.getState();
      const d = durs(s.p);
      let t = s.t + dt;
      let sg = s.seg;
      if (t >= d[sg]) {
        if (sg >= d.length - 1) {
          useLab.setState({ t: d[sg] });
          raf = 0;
          return;
        }
        sg += 1;
        t = 0;
      }
      useLab.setState({ seg: sg, t });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  },
  stop,
  cues: (p: ProjectId, seg: number) => cuesFor(p, seg).at,
  dur: durs,
  get: () => useLab.getState(),
};
(window as unknown as { __lab: typeof lab }).__lab = lab;

function Lab() {
  const { p, seg, t } = useLab();
  const run = runOf(p);
  const s = run.segments[seg];
  const line = s?.lines.find((l) => t >= l.start_sec && t < l.end_sec);
  const face = (p === 'amazon' ? AMAZON : SPOTIFY).meta.manager.face;
  const pct = s ? Math.min(100, (t / s.audio_duration_sec) * 100) : 0;
  const g = q.get('g');
  return (
    <div className="lab b-light">
      <div className="lab-stamp">
        film lab · {p} · chapter {seg} {s?.label} · {t.toFixed(2)} s
      </div>
      <div className="lab-film zd" style={{ '--kf-ground': `var(--b-${g ?? 'film'})` } as React.CSSProperties}>
        <Film project={p} seg={seg} t={t} />
        <div className="lab-cap">{line?.text}</div>
        <img className="lab-face" src={face} alt="" />
        <div className="lab-bar">
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Lab />);
(window as unknown as { ZT: { ready: boolean } }).ZT = { ready: true };
