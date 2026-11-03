/* The film's few drawn things: a real logo on its tile, a face, a thing with its name under it, a person card, the speaker
   her volume analogy needs, a page, a real Google Sheets view and the road of stages. Everything is ink on the ground. */
import type { LucideIcon } from 'lucide-react';
import { FileSpreadsheet, FileText, Link as LinkIcon, Presentation } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Ico, In, sw, useFilm } from './core';

export const Logo = ({ src, s, c }: { src: string; s: number; c?: string }) => (
  <span className={'kf-logo' + (c ? ' ' + c : '')} style={{ width: s, height: s, borderRadius: s * 0.24 }}>
    <img src={src} alt="" style={{ width: s * 0.56, height: s * 0.56 }} />
  </span>
);

export const Face = ({ src, s }: { src: string; s: number }) => <img className="kf-face" src={src} alt="" style={{ width: s, height: s }} />;

/* a thing with its name, and a dim line under the name */
export function Node({ children, l, sub, gap = 24, c }: { children?: ReactNode; l?: string; sub?: string; gap?: number; c?: string }) {
  return (
    <div className={'kf-node' + (c ? ' ' + c : '')} style={{ gap }}>
      {children}
      {(l || sub) && (
        <div className="kf-lab">
          {l && <b className="kf-l">{l}</b>}
          {sub && <span className="kf-s">{sub}</span>}
        </div>
      )}
    </div>
  );
}

/* a person: face left, the name, and the role under the name */
export function Who({ src, s = 132, n, r }: { src: string; s?: number; n: string; r: string }) {
  return (
    <div className="kf-who">
      <Face src={src} s={s} />
      <div className="kf-lab kf-left">
        <b className="kf-l">{n}</b>
        <span className="kf-s">{r}</span>
      </div>
    </div>
  );
}

/* the volume in her analogy: a speaker and its sound, one wave a notch. Never a knob control */
export function Speaker({ s, lv }: { s: number; lv: number }) {
  return (
    <svg
      className="kf-spk"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw(s)}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
      <path className={'kf-arc' + (lv >= 1 ? ' on' : '')} d="M15 9.5a3.5 3.5 0 0 1 0 5" />
      <path className={'kf-arc' + (lv >= 2 ? ' on' : '')} style={{ transitionDelay: lv >= 2 ? '.08s' : '0s' }} d="M17.8 7a7 7 0 0 1 0 10" />
      <path className={'kf-arc' + (lv >= 3 ? ' on' : '')} style={{ transitionDelay: lv >= 3 ? '.16s' : '0s' }} d="M20.6 4.5a10.5 10.5 0 0 1 0 15" />
    </svg>
  );
}

export const Page = ({ w, h, children, c, s }: { w: number; h: number; children?: ReactNode; c?: string; s?: CSSProperties }) => (
  <div className={'kf-page' + (c ? ' ' + c : '')} style={{ width: w, height: h, ...s }}>
    {children}
  </div>
);

/* a line of text on a page, drawn as a bar */
export const Bar = ({ w, c }: { w: number; c?: string }) => <i className={'kf-bar' + (c ? ' ' + c : '')} style={{ width: w }} />;

/* the file type as a small icon and its extension */
const EXT_ICON: Record<string, LucideIcon> = { '.pdf': FileText, '.pptx': Presentation, Link: LinkIcon, '.csv': FileSpreadsheet };
export function Ext({ t, label, s = 40 }: { t: string; label?: string; s?: number }) {
  const img = t === '.csv' ? 'static/logos/f-csv.svg' : t === '.md' ? 'static/logos/f-md.svg' : null;
  return (
    <span className="kf-ext">
      {img ? <img src={img} alt="" style={{ width: s, height: s }} /> : <Ico I={EXT_ICON[t] ?? FileText} s={s} />}
      <span>{label ?? t}</span>
    </span>
  );
}

/* ---------- a real Google Sheets view, a few rows of a real file ---------- */
export interface SheetRow {
  n: number;
  cells: { text: string; bad?: boolean; ph?: boolean }[];
}
const letter = (i: number) => String.fromCharCode(65 + i);

export function Sheet({
  name,
  cols,
  widths,
  rows,
  rowK,
  badK,
  rowH = 52,
}: {
  name: string;
  cols: string[];
  widths: number[];
  rows: SheetRow[];
  rowK: string;
  badK?: string;
  rowH?: number;
}) {
  const f = useFilm();
  const bad = badK ? f.on(badK) : false;
  let nb = 0;
  const row = (r: SheetRow) => (
    <div className="kf-row" style={{ height: rowH }}>
      <i className="kf-c kf-rn">{r.n}</i>
      {r.cells.map((c, j) => {
        const i = c.bad ? nb++ : 0;
        return (
          <i
            key={j}
            className={'kf-c' + (c.bad && bad ? ' bad' : '') + (c.ph ? ' ph' : '')}
            style={{ width: widths[j], transitionDelay: c.bad && bad && f.live ? `${i * 0.11}s` : '0s' }}
          >
            {c.text}
          </i>
        );
      })}
    </div>
  );
  return (
    <div className="kf-sheet b-light">
      <div className="kf-sh-top">
        <img src="static/logos/logo-sheets.svg" alt="" />
        <span>{name}</span>
      </div>
      <div className="kf-row kf-hd">
        <i className="kf-c kf-rn" />
        {cols.map((_, j) => (
          <i key={j} className="kf-c" style={{ width: widths[j] }}>
            {letter(j)}
          </i>
        ))}
      </div>
      <div className="kf-row kf-names" style={{ height: rowH }}>
        <i className="kf-c kf-rn">1</i>
        {cols.map((c, j) => (
          <i key={j} className="kf-c" style={{ width: widths[j] }}>
            {c}
          </i>
        ))}
      </div>
      {rows.map((r, i) => (
        <In key={r.n} k={rowK} d={i * 0.06} a="rise">
          {row(r)}
        </In>
      ))}
    </div>
  );
}

/* ---------- the road: one dot a stage, its name under it ---------- */
export interface Step {
  name: string;
  type: string; /* .csv, .pdf, Link */
  chip: string; /* what the chip says: the type, or the deliverable's name */
  min: number;
}

export function Road({
  steps,
  gap,
  popK,
  labK,
  extK,
  cur = -1,
  minK,
  fill = 0,
  extTill,
  big = false,
}: {
  steps: Step[];
  gap: number;
  popK: string;
  labK?: string; /* names arrive on this cue, with the dots when absent */
  extK?: string;
  cur?: number;
  minK?: string; /* the cue of the current stage's minutes */
  fill?: number; /* 0 to 1, how much of the road is drawn in ink */
  extTill?: string;
  big?: boolean;
}) {
  const w = (steps.length - 1) * gap;
  return (
    <div className={'kf-road' + (big ? ' big' : '')} style={{ width: w }}>
      <i className="kf-track" />
      <i className="kf-fill" style={{ transform: `scaleX(${fill})` }} />
      {steps.map((st, i) => (
        <div key={i} className={'kf-stop' + (i === cur ? ' cur' : '') + (cur >= 0 && i !== cur ? ' off' : '')} style={{ left: i * gap }}>
          <In k={popK} d={i * 0.09} a="pop" c="kf-dotw">
            <i className="kf-dot" />
          </In>
          <In k={labK ?? popK} d={0.1 + i * 0.09} c="kf-stopl">
            <span className="kf-sn">{st.name}</span>
          </In>
          {i === cur && minK && (
            <In key={minK} k={minK} c="kf-min">
              {st.min} min
            </In>
          )}
          {extK && (
            <In k={extK} till={extTill} d={i * 0.08} c="kf-stope">
              <Ext t={st.type} label={st.chip} s={34} />
            </In>
          )}
        </div>
      ))}
    </div>
  );
}
