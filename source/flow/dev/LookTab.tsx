/* Developer mode's Look, set out like Figma's right panel (b21): presets and Inspect, what you picked, the text styles every
   screen reads, then the screen you are on (type, layout, fill), colour, and the look switches folded away. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Copy, Crosshair, Plus, RotateCcw, X } from 'lucide-react';

import { DialRow, DialToggle } from '../ds/DialPanel';
import { setLook, useLooks, type LookStyle } from '../looks';
import { useFlow } from '../engine/store';
import {
  DEFAULT_PRESET,
  TUNES,
  applyPreset,
  dropPreset,
  liveColour,
  resetOne,
  savePreset,
  setTune,
  tuneCss,
  useTune,
  type ColourTune,
  type SizeTune,
  type TuneScreen,
  LAYOUT,
  TYPE_STYLES,
  pickKey,
  styleOf,
} from './tune';
import Inspector, { clearPick, setInspecting, useInspect } from './Inspector';

const STYLES: [LookStyle, string][] = [
  [1, 'Blue grey'],
  [2, 'White'],
  [3, 'Grey and white'],
];
const SWITCHES = ['pip-surface'];
const sizesOf = (sc: TuneScreen) => TUNES.filter((t): t is SizeTune => t.kind === 'size' && t.screen === sc && !SWITCHES.includes(t.id));
const styleTunes = (id: string) => TUNES.filter((t): t is SizeTune => t.kind === 'size' && styleOf(t) === id);
const coloursOf = (sc: TuneScreen) => TUNES.filter((t): t is ColourTune => t.kind === 'colour' && t.screen === sc && t.group === 'accent');
const SCREENS: [TuneScreen, string][] = [
  ['objective', 'Objective'],
  ['stage', 'Stage'],
  ['pip', 'PiP'],
];
const fmt = (v: number, t: SizeTune) => (t.unit === 'em' ? v.toFixed(3) : t.unit === '' && t.step && t.step < 1 ? v.toFixed(2) : String(v)) + (t.unit === 'px' || t.unit === '' ? '' : t.unit);
const colour = (id: string) => TUNES.find((t): t is ColourTune => t.kind === 'colour' && t.id === id)!;
const PAIRS: [string, string, string][] = [
  ['Ground', 'd-ground', 'l-ground'],
  ['Surface', 'd-slab', 'l-slab'],
  ['Raised', 'd-slab2', 'l-slab2'],
  ['Ink', 'd-ink', 'l-ink'],
];
const ACCENTS = ['key', 'green', 'link'];

const digits = (step: number) => (step >= 1 ? 0 : String(step).split('.')[1]?.length ?? 2);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/* a field in the Figma manner: the label is a handle you drag sideways to scrub, the number is typed, arrows step it
   (shift for ten), a double click on the label puts it back */
function Field({ label, value, set, step, min, max, unit, onChange, onReset }: { label: string; value: number; set: boolean; step: number; min: number; max: number; unit?: string; onChange: (n: number) => void; onReset: () => void }) {
  const d = digits(step);
  const shown = value.toFixed(d);
  const [draft, setDraft] = useState<string | null>(null);
  const drag = useRef<{ x: number; v: number } | null>(null);
  const put = (n: number) => onChange(Number(clamp(Math.round(n / step) * step, min, max).toFixed(d)));
  const commit = () => {
    if (draft !== null && draft.trim() !== '' && Number.isFinite(Number(draft))) put(Number(draft));
    setDraft(null);
  };
  return (
    <label className="zdm-f" data-set={set || undefined} title={label}>
      <span
        className="zdm-f-l"
        onPointerDown={(e) => {
          e.preventDefault();
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* scrubbing still follows while the pointer stays on the label */
          }
          drag.current = { x: e.clientX, v: value };
        }}
        onPointerMove={(e) => {
          if (drag.current) put(drag.current.v + Math.round((e.clientX - drag.current.x) / 3) * step);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onDoubleClick={onReset}
      >
        {label}
      </span>
      <input
        inputMode="decimal"
        value={draft ?? shown}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            setDraft(null);
            put(value + (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1));
          }
        }}
      />
      {unit && <i>{unit}</i>}
    </label>
  );
}

function TuneField({ t, label }: { t: SizeTune; label?: string }) {
  const set = useTune((s) => s.values[t.id]);
  return (
    <Field
      label={label ?? t.label}
      value={Number(set ?? t.base)}
      set={set !== undefined}
      step={t.step ?? 1}
      min={t.min}
      max={t.max}
      unit={t.unit === 'px' ? '' : t.unit}
      onChange={(n) => (n === t.base ? resetOne(t.id) : setTune(t.id, n))}
      onReset={() => resetOne(t.id)}
    />
  );
}

/* a section with its title, folded or open, remembered per browser */
const OPEN_KEY = 'zero-stage-look-open';
const readOpen = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
};
function Section({ id, title, aside, closed, children }: { id: string; title: string; aside?: ReactNode; closed?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(() => readOpen()[id] ?? !closed);
  const flip = () => {
    setOpen(!open);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify({ ...readOpen(), [id]: !open }));
    } catch {
      /* stays as it is for this visit */
    }
  };
  return (
    <section className="zdm-sec" data-open={open || undefined}>
      <div className="zdm-sec-h">
        <button type="button" aria-expanded={open} onClick={flip}>
          <ChevronDown size={14} strokeWidth={1.75} />
          {title}
        </button>
        {aside}
      </div>
      {open && <div className="zdm-sec-b">{children}</div>}
    </section>
  );
}

/* one text style: a sample at its size, its name and numbers; open it and its fields sit under it */
function StyleRow({ id, label, used }: { id: string; label: string; used: string }) {
  const tunes = styleTunes(id);
  const values = useTune((s) => s.values);
  const [open, setOpen] = useState(false);
  const val = (t: SizeTune) => Number(values[t.id] ?? t.base);
  const fs = tunes.find((t) => t.id.endsWith('-fs'));
  const touched = tunes.some((t) => values[t.id] !== undefined);
  const meta = tunes.map((t) => (t.unit === 'em' ? `${(val(t) * 100).toFixed(1)}%` : String(val(t)))).join(' / ');
  return (
    <div className="zdm-ts" data-open={open || undefined} data-set={touched || undefined}>
      <button type="button" className="zdm-ts-h" aria-expanded={open} onClick={() => setOpen(!open)}>
        <b style={{ fontSize: Math.min(22, fs ? val(fs) : 14) }}>Ag</b>
        <span>
          {label}
          <em>{used}</em>
        </span>
        <small>{meta}</small>
      </button>
      {open && (
        <div className="zdm-fg">
          {tunes.map((t) => (
            <TuneField key={t.id} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

/* what Inspect picked: its selector, how many share it, and the fields a designer reaches for first */
const PICK_FIELDS: { prop: string; label: string; step: number; min: number; max: number; read: (c: CSSStyleDeclaration) => number }[] = [
  { prop: 'font-size', label: 'Size', step: 1, min: 6, max: 120, read: (c) => parseFloat(c.fontSize) },
  { prop: 'line-height', label: 'Line height', step: 1, min: 0, max: 200, read: (c) => (c.lineHeight === 'normal' ? Math.round(parseFloat(c.fontSize) * 1.2) : parseFloat(c.lineHeight)) },
  { prop: 'letter-spacing', label: 'Letter spacing', step: 0.1, min: -10, max: 20, read: (c) => (c.letterSpacing === 'normal' ? 0 : parseFloat(c.letterSpacing)) },
  { prop: 'font-weight', label: 'Weight', step: 100, min: 100, max: 900, read: (c) => Number(c.fontWeight) || 400 },
  { prop: 'width', label: 'Width', step: 1, min: 0, max: 2400, read: (c) => parseFloat(c.width) || 0 },
  { prop: 'border-radius', label: 'Radius', step: 1, min: 0, max: 200, read: (c) => parseFloat(c.borderTopLeftRadius) || 0 },
  { prop: 'padding-inline', label: 'Padding X', step: 1, min: 0, max: 200, read: (c) => parseFloat(c.paddingLeft) || 0 },
  { prop: 'padding-block', label: 'Padding Y', step: 1, min: 0, max: 200, read: (c) => parseFloat(c.paddingTop) || 0 },
];
const unitless = (prop: string) => prop === 'font-weight';

function Picked() {
  const sel = useInspect((s) => s.sel);
  const el = useInspect((s) => s.el);
  const count = useInspect((s) => s.count);
  const values = useTune((s) => s.values);
  if (!sel) return null;
  const live = el?.isConnected ? getComputedStyle(el) : null;
  const keys = PICK_FIELDS.map((f) => pickKey(sel, f.prop));
  const touched = keys.some((k) => values[k] !== undefined);
  return (
    <Section
      id="pick"
      title="Selection"
      aside={
        <span className="zdm-sec-a">
          {touched && (
            <button type="button" className="zdm-icon" aria-label="Reset this selection" onClick={() => keys.forEach((k) => resetOne(k))}>
              <RotateCcw size={13} strokeWidth={1.75} />
            </button>
          )}
          <button type="button" className="zdm-icon" aria-label="Clear the selection" onClick={clearPick}>
            <X size={13} strokeWidth={1.75} />
          </button>
        </span>
      }
    >
      <div className="zdm-pick">
        <code>{sel}</code>
        <span>{count === 1 ? '1 on the page' : `${count} on the page`}</span>
      </div>
      <div className="zdm-fg">
        {PICK_FIELDS.map((f) => {
          const k = pickKey(sel, f.prop);
          const saved = values[k];
          const v = saved !== undefined ? parseFloat(String(saved)) : live ? f.read(live) : 0;
          return (
            <Field
              key={f.prop}
              label={f.label}
              value={Number.isFinite(v) ? v : 0}
              set={saved !== undefined}
              step={f.step}
              min={f.min}
              max={f.max}
              onChange={(n) => setTune(k, unitless(f.prop) ? String(n) : `${n}px`)}
              onReset={() => resetOne(k)}
            />
          );
        })}
      </div>
    </Section>
  );
}

function InspectBar() {
  const on = useInspect((s) => s.on);
  /* Inspect stops when Look goes away */
  useEffect(() => () => setInspecting(false), []);
  return (
    <div className="zdm-insbar">
      <button type="button" className="zdm-ins-go" aria-pressed={on} onClick={() => setInspecting(!on)}>
        <Crosshair size={14} strokeWidth={1.75} />
        {on ? 'Inspecting' : 'Inspect'}
      </button>
      <span>{on ? 'Click anything on the page. Esc stops.' : 'Pick an element and change it.'}</span>
    </div>
  );
}

function Swatch({ t }: { t: ColourTune }) {
  const set = useTune((s) => s.values[t.id]);
  /* re-read the live value whenever the look changes under it */
  useLooks((l) => l.style);
  const hex = set !== undefined ? String(set) : liveColour(t);
  return (
    <label className="zdm-sw" data-set={set !== undefined || undefined}>
      <i style={{ background: hex }} />
      <span>{hex}</span>
      <input type="color" value={hex} aria-label={t.label} onChange={(e) => setTune(t.id, e.target.value)} />
    </label>
  );
}

function Presets() {
  const presets = useTune((s) => s.presets);
  const active = useTune((s) => s.active);
  const values = useTune((s) => s.values);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tuneCss(values) || '/* no changes */');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* the clipboard said no; nothing else changes */
    }
  };
  return (
    <div className="zdm-presets">
      {[DEFAULT_PRESET, ...presets.map((p) => p.name)].map((name) => (
        <span key={name} className="zdm-pre" data-on={active === name || undefined}>
          <button type="button" onClick={() => applyPreset(name)}>
            {name}
          </button>
          {name !== DEFAULT_PRESET && (
            <button type="button" className="zdm-pre-x" aria-label={`Delete ${name}`} onClick={() => dropPreset(name)}>
              <X size={12} strokeWidth={2} />
            </button>
          )}
        </span>
      ))}
      <button type="button" className="zdm-pre-add" onClick={savePreset}>
        <Plus size={14} strokeWidth={1.75} />
        Save
      </button>
      <button type="button" className="zdm-pre-add" aria-label="Copy the changes as CSS" onClick={() => void copy()}>
        {copied ? <Check size={14} strokeWidth={1.75} /> : <Copy size={14} strokeWidth={1.75} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function Scale() {
  const set = useTune((s) => s.values['pip-scale']);
  const v = Number(set ?? 100);
  return (
    <div className="zdm-tabs zdm-scale" role="radiogroup" aria-label="PiP scale">
      {[100, 200, 300].map((n) => (
        <button key={n} type="button" role="radio" aria-selected={v === n} aria-checked={v === n} onClick={() => (n === 100 ? resetOne('pip-scale') : setTune('pip-scale', n))}>
          {n / 100}x
        </button>
      ))}
    </div>
  );
}

export default function LookTab() {
  const looks = useLooks();
  const screen = useFlow((s) => s.screen);
  const surface = useFlow((s) => (s.ui as { surface?: string }).surface);
  const surfaceOn = useTune((s) => s.values['pip-surface']) === undefined;
  const [which, setWhich] = useState<TuneScreen>(screen === 'stage' ? (surface === 'pip' ? 'pip' : 'stage') : 'objective');
  const flowActions = useFlow((s) => s.actions);
  const lightStage = useFlow((s) => (s.ui as { lightStage?: boolean }).lightStage ?? false);
  const setLight = (flowActions as unknown as { setLightStage?: (v: boolean) => void }).setLightStage;

  const sizes = sizesOf(which);
  const text = sizes.filter((t) => !LAYOUT.has(t.id));
  const layout = sizes.filter((t) => LAYOUT.has(t.id));

  return (
    <>
      <Presets />
      <InspectBar />
      <Inspector />
      <Picked />

      <Section id="type" title="Text styles" aside={<span className="zdm-sec-n">Every screen</span>}>
        {TYPE_STYLES.map((st) => (
          <StyleRow key={st.id} {...st} />
        ))}
      </Section>

      <Section id="screen" title="This screen">
        <div className="zdm-tabs zdm-screens" role="tablist" aria-label="Screen to tune">
          {SCREENS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={which === id} onClick={() => setWhich(id)}>
              {label}
            </button>
          ))}
        </div>
        {which === 'pip' && <Scale />}
        {which === 'pip' && (
          <DialRow label="Chat surface">
            <DialToggle label="PiP chat surface" on={surfaceOn} onChange={(v) => (v ? resetOne('pip-surface') : setTune('pip-surface', 0))} />
          </DialRow>
        )}
        {text.length > 0 && (
          <>
            <div className="zdm-sub">Type</div>
            <div className="zdm-fg">
              {text.map((t) => (
                <TuneField key={t.id} t={t} />
              ))}
            </div>
          </>
        )}
        {layout.length > 0 && (
          <>
            <div className="zdm-sub">Layout</div>
            <div className="zdm-fg">
              {layout.map((t) => (
                <TuneField key={t.id} t={t} />
              ))}
            </div>
          </>
        )}
        {coloursOf(which).length > 0 && (
          <>
            <div className="zdm-sub">Fill</div>
            <div className="zdm-cols zdm-cols-1">
              {coloursOf(which).map((t) => (
                <div key={t.id} className="zdm-col-r">
                  <span>{t.label}</span>
                  <Swatch t={t} />
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      <Section id="colour" title="Colour" aside={<span className="zdm-sec-n">Every screen</span>}>
        <div className="zdm-cols" data-screen={screen}>
          <span />
          <span className="zdm-col-h">Dark</span>
          <span className="zdm-col-h">Light</span>
          {PAIRS.map(([label, d, l]) => (
            <div key={label} className="zdm-col-r">
              <span>{label}</span>
              <Swatch t={colour(d)} />
              <Swatch t={colour(l)} />
            </div>
          ))}
        </div>
        <div className="zdm-cols zdm-cols-1">
          {ACCENTS.map((id) => (
            <div key={id} className="zdm-col-r">
              <span>{colour(id).label}</span>
              <Swatch t={colour(id)} />
            </div>
          ))}
        </div>
      </Section>

      <Section id="look" title="Appearance" closed>
        {STYLES.map(([n, label]) => (
          <DialRow key={n} label={label}>
            <DialToggle label={label} on={looks.style === n} onChange={(v) => setLook({ style: v ? n : 1 })} />
          </DialRow>
        ))}
        {setLight && (
          <DialRow label="Stage light mode">
            <DialToggle label="Stage light mode" on={lightStage} onChange={setLight} />
          </DialRow>
        )}
        <DialRow label="Panel outline">
          <DialToggle label="Stage panel outline" on={looks.slotOutline} onChange={(v) => setLook({ slotOutline: v })} />
        </DialRow>
        <DialRow label="Chat on surface 2">
          <DialToggle label="Chat on surface 2" on={looks.chatSurface} onChange={(v) => setLook({ chatSurface: v })} />
        </DialRow>
      </Section>
    </>
  );
}
