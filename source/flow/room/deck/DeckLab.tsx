/* ?decklab and ?decklab&project=amazon: the deck alone, in a frame of the real size on the real sheet, driven by hand or by the real cue times.
   Never linked from the product and removed before ship. Nothing else may depend on it. */
import { ChevronLeft, Pause, Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { runOf } from '../run';
import VoiceFace from '../../ds/VoiceFace';
import type { ProjectId } from '../../types';
import { deckAt } from './cues';
import Deck from './Deck';
import { DECKS } from './panels';

const q = new URLSearchParams(location.search);
const project: ProjectId = q.get('project') === 'amazon' ? 'amazon' : 'spotify';
const LOGO = `static/logos/logo-${project}.svg`;
const TITLE = project === 'amazon' ? 'Build an App That Fact-Checks Amazon Announcements' : 'Find Where Spotify Can Raise Prices Next';

const CSS = `
.dl-sheet{position:fixed;inset:14px;display:flex;flex-direction:column;border-radius:28px;background:var(--zj-sheet);box-shadow:var(--zj-sh-sheet)}
.dl-head{display:flex;align-items:center;gap:10px;flex:none;height:56px;padding:0 16px}
.dl-head b{font-weight:500;color:var(--zj-ink)}
.dl-body{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;flex:1;min-height:0;width:100%;max-width:1760px;margin:0 auto;padding:0 16px 16px}
.dl-left{display:flex;flex-direction:column;gap:10px;min-width:0;min-height:0}
.dl-frame{position:relative;flex:1;min-height:0;border-radius:20px;background:var(--z4-frame);box-shadow:var(--zj-sh-hair);overflow:hidden}
.dl-face{position:absolute;left:12px;bottom:6px}
.dl-cap{position:absolute;left:64px;right:64px;bottom:16px;font-size:14px;line-height:20px;color:var(--zj-ink);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dl-bar{display:flex;align-items:center;gap:8px;flex:none;height:44px;padding:0 6px;border-radius:14px;background:var(--zj-sheet);box-shadow:var(--zj-sh-ring);color:var(--zj-ink3);font-size:12px}
.dl-track{flex:1;height:4px;border-radius:2px;background:var(--zj-well2)}
.dl-notes{border-radius:20px;box-shadow:var(--zj-sh-hair);padding:16px;color:var(--zj-ink3)}
`;

interface LabApi {
  set(panel: string, shown?: string[]): void;
  seek(chapter: string, t: number): void;
  play(chapter: string, rate?: number): Promise<void>;
  stop(): void;
  info(): { project: ProjectId; panels: { panel: string; ids: string[] }[]; frame: { w: number; h: number } };
  through(panel: string): string[];
  full(panel: string): string[];
  chapters(): { id: string; dur: number; cues: number }[];
}

/* every reveal the script holds, by panel, in script order */
const idsByPanel = (): { panel: string; ids: string[] }[] => {
  const run = runOf(project);
  const out: { panel: string; ids: string[] }[] = [];
  run.segments.forEach((s) =>
    s.cues.forEach((c) => {
      if (c.action === 'set_panel') out.push({ panel: c.args.id, ids: [] });
      else if (c.action === 'show') out[out.length - 1]?.ids.push(c.args.id);
    })
  );
  return out;
};

export default function DeckLab() {
  const [st, setSt] = useState<{ panel: string; shown: Set<string> }>({ panel: DECKS[project][0].panels[0], shown: new Set() });
  const [cap, setCap] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  useEffect(() => {
    const run = runOf(project);
    const stop = () => cancelAnimationFrame(raf.current);
    const list = idsByPanel();
    const api: LabApi = {
      set: (panel, shown = []) => setSt({ panel, shown: new Set(shown) }),
      seek: (chapter, t) => {
        const i = run.segments.findIndex((s) => s.id === chapter);
        const seg = run.segments[i];
        setSt(deckAt(run, i, t));
        setCap(seg.lines.find((l) => t >= l.start_sec && t < l.end_sec)?.text ?? null);
      },
      play: (chapter, rate = 1) =>
        new Promise((resolve) => {
          stop();
          const i = run.segments.findIndex((s) => s.id === chapter);
          const seg = run.segments[i];
          const t0 = performance.now();
          let key = '';
          const tick = () => {
            const t = ((performance.now() - t0) / 1000) * rate;
            const next = deckAt(run, i, t);
            const k = next.panel + [...next.shown].join('|');
            if (k !== key) {
              key = k;
              setSt(next);
            }
            setCap(seg.lines.find((l) => t >= l.start_sec && t < l.end_sec)?.text ?? null);
            if (t >= seg.audio_duration_sec) resolve();
            else raf.current = requestAnimationFrame(tick);
          };
          tick();
        }),
      stop,
      info: () => {
        const r = frame.current?.getBoundingClientRect();
        return { project, panels: list, frame: { w: Math.round(r?.width ?? 0), h: Math.round(r?.height ?? 0) } };
      },
      through: (panel) => {
        const out: string[] = [];
        for (const p of list) {
          if (p.panel === panel) break;
          out.push(...p.ids);
        }
        return out;
      },
      full: (panel) => {
        const out: string[] = [];
        for (const p of list) {
          out.push(...p.ids);
          if (p.panel === panel) break;
        }
        return out;
      },
      chapters: () => run.segments.map((s) => ({ id: s.id, dur: s.audio_duration_sec, cues: s.cues.length })),
    };
    (window as unknown as { __deck: LabApi }).__deck = api;
    (window as unknown as { ZT: { ready: boolean } }).ZT = { ready: true };
    return stop;
  }, []);

  return (
    <div className="z-root zj" style={{ position: 'fixed', inset: 0, background: 'var(--zj-canvas)' }}>
      <style>{CSS}</style>
      <div className="dl-sheet">
        <div className="dl-head">
          <button type="button" className="zj-round" aria-label="Back">
            <ChevronLeft size={16} strokeWidth={1.75} />
          </button>
          <span className="zj-lg">
            <img src={LOGO} alt="" />
          </span>
          <b>{TITLE}</b>
          <span style={{ flex: 1 }} />
          <span className="zj-status">Level 5</span>
        </div>
        <div className="dl-body">
          <div className="dl-left">
            <div ref={frame} className="dl-frame">
              <Deck project={project} panel={st.panel} shown={st.shown} quiet />
              <span className="dl-face">
                <VoiceFace size={40} />
              </span>
              {cap && <p className="dl-cap">{cap}</p>}
            </div>
            <div className="dl-bar">
              <Pause size={16} strokeWidth={1.75} style={{ marginLeft: 8 }} />
              <span className="dl-track" />
              <span>1x</span>
              <Settings size={16} strokeWidth={1.75} style={{ marginRight: 8 }} />
            </div>
          </div>
          <div className="dl-notes">Notes</div>
        </div>
      </div>
    </div>
  );
}
