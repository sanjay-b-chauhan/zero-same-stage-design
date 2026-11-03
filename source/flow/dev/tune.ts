/* The look by hand, from developer mode (his note, 2 Nov: "give me the whole visual control of the typo, colors,
   presets"). Every control is one token. Nothing is written until you move one, so every screen keeps its own values;
   a moved control lands in one style tag with !important, so it wins over every look style and surface that sets the
   same token. Saved per browser, with presets you name by saving. */
import { create } from 'zustand';

export type TuneGroup = 'type' | 'dark' | 'light' | 'accent';
/* b20 (his note: "Stage screen, PIOP and this screen and all please typography size, letter spacing and all"): every
   control belongs to one screen, so Look shows the screen you are tuning and nothing else */
export type TuneScreen = 'objective' | 'stage' | 'pip' | 'all';
export type TuneValues = Record<string, string | number>;

interface Base {
  id: string;
  group: TuneGroup;
  screen: TuneScreen;
  label: string;
  at: string;
  decl: (v: string) => Record<string, string>;
}
export interface SizeTune extends Base {
  kind: 'size';
  base: number;
  min: number;
  max: number;
  step?: number;
  /* what the number reads as beside the label */
  unit?: string;
}
export interface ColourTune extends Base {
  kind: 'colour';
  /* the class a hidden probe carries to read the value the screen has now */
  probe: string;
  prop: string;
}
export type Tune = SizeTune | ColourTune;

const DARK = ':root, .zd';
const LIGHT = '.b-light, .z-light';
const STAGE = '.zs2';
const OB = '.ob';
const PIP = '.zs2.zp';
const px = (prop: string) => (v: string) => ({ [prop]: `${v}px` });
const em = (prop: string) => (v: string) => ({ [prop]: `${v}em` });
const one = (prop: string) => (v: string) => ({ [prop]: v });
const pct = (prop: string) => (v: string) => ({ [prop]: String(Number(v) / 100) });
const ink = (t2: number, t3: number) => (v: string) => ({
  '--b-t1': v,
  '--b-t2': `color-mix(in srgb, ${v} ${t2}%, transparent)`,
  '--b-t3': `color-mix(in srgb, ${v} ${t3}%, transparent)`,
});
type SizeArgs = [id: string, screen: TuneScreen, label: string, at: string, decl: (v: string) => Record<string, string>, base: number, min: number, max: number, step?: number, unit?: string];
const size = ([id, screen, label, at, decl, base, min, max, step = 1, unit = 'px']: SizeArgs): SizeTune => ({
  id,
  group: 'type',
  screen,
  label,
  kind: 'size',
  at,
  decl,
  base,
  min,
  max,
  step,
  unit,
});
const TRACK = 0.005;
const colourAt = (id: string, screen: TuneScreen, label: string, probe: string, prop: string, at: string): ColourTune => ({
  id,
  group: 'accent',
  screen,
  label,
  kind: 'colour',
  probe,
  prop,
  at,
  decl: one(prop),
});

/* b21 (his note: "some default global changes typo should also be there and not each, we are working in system"): five
   text styles that every screen reads, in the Figma manner. A style writes the tokens the screens already use, so it flows
   everywhere at once; a screen's own control below it still wins, because it comes later in the same tag */
const G = ':root, .zs2';
const many = (vars: string[], unit: string) => (v: string) => Object.fromEntries(vars.map((k) => [k, `${v}${unit}`]));
export const TYPE_STYLES: { id: string; label: string; used: string }[] = [
  { id: 'display', label: 'Display', used: 'Objective title' },
  { id: 'title', label: 'Title', used: 'Her line, page titles' },
  { id: 'heading', label: 'Heading', used: 'Stage names' },
  { id: 'body', label: 'Body', used: 'Chat, here and in the PiP' },
  { id: 'caption', label: 'Caption', used: 'Section titles, issue rows' },
];
export const styleOf = (t: Tune) => (t.id.startsWith('ty-') ? t.id.split('-')[1] : null);
/* the per screen controls that are layout, not type */
export const LAYOUT = new Set(['ob-logo', 'ob-stages-k', 'ob-row-h', 'ob-node', 'ob-node-gap', 'ob-card-pad', 'ob-card-r', 'ob-gap', 'chat-col', 'pip-scale', 'pip-pad', 'pip-bar-h', 'pip-key', 'pip-icon', 'pip-gap']);

export const TUNES: Tune[] = [
  ...(
    [
      ['ty-display-fs', 'all', 'Size', G, many(['--ob-title-fs'], 'px'), 40, 24, 80],
      ['ty-display-lh', 'all', 'Line height', G, many(['--ob-title-lh'], ''), 1.15, 0.9, 1.6, 0.05, ''],
      ['ty-display-ls', 'all', 'Letter spacing', G, many(['--ob-title-ls'], 'em'), -0.035, -0.08, 0.04, TRACK, 'em'],
      ['ty-display-fw', 'all', 'Weight', G, many(['--ob-title-fw'], ''), 500, 300, 700, 100, ''],
      ['ty-title-fs', 'all', 'Size', G, many(['--ob-line-fs', '--zt-title'], 'px'), 28, 16, 48],
      ['ty-title-lh', 'all', 'Line height', G, many(['--ob-line-lh'], ''), 1.25, 0.9, 1.8, 0.05, ''],
      ['ty-title-ls', 'all', 'Letter spacing', G, many(['--ob-line-ls'], 'em'), -0.03, -0.08, 0.04, TRACK, 'em'],
      ['ty-heading-fs', 'all', 'Size', G, many(['--ob-stage-fs'], 'px'), 18, 12, 36],
      ['ty-heading-ls', 'all', 'Letter spacing', G, many(['--ob-stage-ls'], 'em'), -0.012, -0.06, 0.04, TRACK, 'em'],
      ['ty-heading-fw', 'all', 'Weight', G, many(['--ob-stage-fw'], ''), 500, 300, 700, 100, ''],
      ['ty-body-fs', 'all', 'Size', G, many(['--zs2-chat-fs'], 'px'), 14, 11, 22],
      ['ty-body-lg', 'all', 'Line gap', G, many(['--zs2-chat-lg'], 'px'), 6, 0, 16],
      ['ty-body-ls', 'all', 'Letter spacing', G, many(['--zs2-chat-ls'], 'em'), 0, -0.04, 0.06, TRACK, 'em'],
      ['ty-caption-fs', 'all', 'Size', G, many(['--zs2-head-fs', '--zs2-slot-fs'], 'px'), 12, 10, 18],
    ] as SizeArgs[]
  ).map(size),
  ...(
    [
      ['ob-title-fs', 'objective', 'Title size', OB, px('--ob-title-fs'), 40, 24, 80],
      ['ob-title-ls', 'objective', 'Title spacing', OB, em('--ob-title-ls'), -0.035, -0.08, 0.04, TRACK, 'em'],
      ['ob-title-lh', 'objective', 'Title line height', OB, one('--ob-title-lh'), 1.15, 0.9, 1.6, 0.05, ''],
      ['ob-title-fw', 'objective', 'Title weight', OB, one('--ob-title-fw'), 500, 300, 700, 100, ''],
      ['ob-logo', 'objective', 'Logo', OB, px('--ob-logo'), 28, 16, 64],
      ['ob-line-fs', 'objective', 'Her line size', OB, px('--ob-line-fs'), 28, 16, 48],
      ['ob-line-ls', 'objective', 'Her line spacing', OB, em('--ob-line-ls'), -0.03, -0.08, 0.04, TRACK, 'em'],
      ['ob-line-lh', 'objective', 'Her line height', OB, one('--ob-line-lh'), 1.25, 0.9, 1.8, 0.05, ''],
      ['ob-stages-k', 'objective', 'Stages scale', OB, pct('--ob-stages-k'), 100, 60, 200, 5, '%'],
      ['ob-stage-fs', 'objective', 'Stage names', OB, px('--ob-stage-fs'), 18, 12, 36],
      ['ob-stage-ls', 'objective', 'Stage spacing', OB, em('--ob-stage-ls'), -0.012, -0.06, 0.04, TRACK, 'em'],
      ['ob-stage-fw', 'objective', 'Stage weight', OB, one('--ob-stage-fw'), 500, 300, 700, 100, ''],
      ['ob-row-h', 'objective', 'Row height', OB, px('--ob-row-h'), 60, 36, 120],
      ['ob-node', 'objective', 'Number circle', OB, px('--ob-node'), 30, 18, 56],
      ['ob-node-fs', 'objective', 'Number size', OB, px('--ob-node-fs'), 13, 9, 24],
      ['ob-node-gap', 'objective', 'Number to name', OB, px('--ob-node-gap'), 16, 4, 48],
      ['ob-card-pad', 'objective', 'Card padding', OB, px('--ob-card-pad'), 20, 8, 40],
      ['ob-card-r', 'objective', 'Card radius', OB, px('--ob-card-r'), 16, 0, 32],
      ['ob-key-fs', 'objective', 'Start key text', OB, px('--ob-key-fs'), 15, 11, 22],
      ['ob-gap', 'objective', 'Gap between sides', OB, px('--ob-gap'), 120, 32, 280, 4],

      ['title', 'stage', 'Page titles', ':root', px('--zt-title'), 28, 20, 40],
      ['head', 'stage', 'Section titles', STAGE, px('--zs2-head-fs'), 12, 10, 18],
      ['slot', 'stage', 'Issue rows', STAGE, px('--zs2-slot-fs'), 12, 10, 18],
      ['chat', 'stage', 'Chat size', STAGE, px('--zs2-chat-fs'), 14, 11, 22],
      ['chat-ls', 'stage', 'Chat spacing', STAGE, em('--zs2-chat-ls'), 0, -0.04, 0.06, TRACK, 'em'],
      ['chat-lg', 'stage', 'Chat line gap', STAGE, px('--zs2-chat-lg'), 6, 0, 16],
      ['chat-col', 'stage', 'Chat width', STAGE, px('--zs2-col'), 600, 400, 960, 10],

      ['pip-scale', 'pip', 'Scale', '.zp-dock', pct('--zp-k'), 100, 50, 300, 25, '%'],
      ['pip-chat', 'pip', 'Chat size', PIP, px('--zs2-chat-fs'), 12, 10, 20],
      ['pip-chat-ls', 'pip', 'Chat spacing', PIP, em('--zs2-chat-ls'), 0, -0.04, 0.06, TRACK, 'em'],
      ['pip-chat-lg', 'pip', 'Chat line gap', PIP, px('--zs2-chat-lg'), 8, 0, 14],
      ['pip-pad', 'pip', 'Chat side padding', PIP, px('--zp-pad'), 8, 0, 32],
      ['pip-bar-h', 'pip', 'Bar height', PIP, px('--zp-bar-h'), 52, 36, 80],
      ['pip-key', 'pip', 'Key size', PIP, px('--zp-key'), 36, 24, 56],
      ['pip-icon', 'pip', 'Icon size', PIP, px('--zp-icon'), 18, 12, 32],
      ['pip-gap', 'pip', 'Key spacing', PIP, px('--zp-gap'), 4, 0, 20],
      ['pip-surface', 'pip', 'Chat surface', PIP, (v: string) => (v === '0' ? { '--zs2-mine-bg': 'transparent' } : {}), 1, 0, 1, 1, ''],
    ] as SizeArgs[]
  ).map(size),

  colourAt('ob-card-bg', 'objective', 'Card fill', 'b-light ob', '--ob-card-bg', OB),
  colourAt('ob-stage-ink', 'objective', 'Stage on', 'b-light ob', '--ob-stage-ink', OB),
  colourAt('ob-later-ink', 'objective', 'Stages after', 'b-light ob', '--ob-later-ink', OB),
  colourAt('ob-node-bg', 'objective', 'Number now', 'b-light ob', '--ob-node-bg', OB),
  colourAt('pip-panel', 'pip', 'Window', 'zs2 zp zd', '--z-panel', PIP),
  colourAt('pip-tx', 'pip', 'Text', 'zs2 zp zd', '--z-tx', PIP),
  colourAt('pip-mine', 'pip', 'Your bubble', 'zs2 zp zd', '--zs2-mine-bg', PIP),

  { id: 'd-ground', group: 'dark', screen: 'all', label: 'Ground', kind: 'colour', probe: 'zd', prop: '--b-ground', at: DARK, decl: one('--b-ground') },
  { id: 'd-slab', group: 'dark', screen: 'all', label: 'Surface', kind: 'colour', probe: 'zd', prop: '--b-slab', at: DARK, decl: one('--b-slab') },
  { id: 'd-slab2', group: 'dark', screen: 'all', label: 'Raised', kind: 'colour', probe: 'zd', prop: '--b-slab2', at: DARK, decl: one('--b-slab2') },
  { id: 'd-ink', group: 'dark', screen: 'all', label: 'Ink', kind: 'colour', probe: 'zd', prop: '--b-t1', at: DARK, decl: ink(62, 38) },

  { id: 'l-ground', group: 'light', screen: 'all', label: 'Ground', kind: 'colour', probe: 'b-light', prop: '--b-ground', at: LIGHT, decl: one('--b-ground') },
  { id: 'l-slab', group: 'light', screen: 'all', label: 'Surface', kind: 'colour', probe: 'b-light', prop: '--b-slab', at: LIGHT, decl: one('--b-slab') },
  { id: 'l-slab2', group: 'light', screen: 'all', label: 'Raised', kind: 'colour', probe: 'b-light', prop: '--b-slab2', at: LIGHT, decl: one('--b-slab2') },
  { id: 'l-ink', group: 'light', screen: 'all', label: 'Ink', kind: 'colour', probe: 'b-light', prop: '--b-t1', at: LIGHT, decl: ink(62, 40) },

  { id: 'key', group: 'accent', screen: 'all', label: 'Key on light', kind: 'colour', probe: 'b-light', prop: '--zk-ink', at: LIGHT, decl: one('--zk-ink') },
  {
    id: 'green',
    group: 'accent',
    screen: 'all',
    label: 'Green',
    kind: 'colour',
    probe: 'zd',
    prop: '--g-fill',
    at: `${DARK}, ${LIGHT}`,
    decl: (v) => ({
      '--g-fill': v,
      '--g-hi': `color-mix(in srgb, ${v} 80%, #fff)`,
      '--g-deep': `color-mix(in srgb, ${v} 78%, #000)`,
      '--g-soft': `color-mix(in srgb, ${v} 14%, transparent)`,
      '--b-ok': v,
    }),
  },
  { id: 'link', group: 'accent', screen: 'stage', label: 'Links', kind: 'colour', probe: 'zs2 zd', prop: '--zs2-link', at: STAGE, decl: one('--zs2-link') },
];

/* moving a control back to where it started takes it out, so the screen keeps its own value again */
export const resetOne = (id: string) => {
  const { [id]: _gone, ...rest } = useTune.getState().values;
  commit({ values: rest, active: null });
};

export interface Preset {
  name: string;
  values: TuneValues;
}
interface TuneState {
  values: TuneValues;
  presets: Preset[];
  active: string | null;
}

const KEY = 'zero-stage-tune';
export const DEFAULT_PRESET = 'Default';

const read = (): TuneState => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<TuneState>;
    return {
      values: saved.values && typeof saved.values === 'object' ? saved.values : {},
      presets: Array.isArray(saved.presets) ? saved.presets.filter((p) => p && typeof p.name === 'string') : [],
      active: typeof saved.active === 'string' ? saved.active : DEFAULT_PRESET,
    };
  } catch {
    return { values: {}, presets: [], active: DEFAULT_PRESET };
  }
};

export const useTune = create<TuneState>(() => read());

/* b21 (his note: "the inspector vibe, click and change the size"): what you change on a clicked element is kept with the
   rest, by its selector, so presets, Copy and reset carry it too */
const PICK = '@';
const SEP = '|';
export const pickKey = (sel: string, prop: string) => `${PICK}${sel}${SEP}${prop}`;
const pickCss = (values: TuneValues): string => {
  const by = new Map<string, string[]>();
  Object.entries(values).forEach(([k, v]) => {
    if (!k.startsWith(PICK)) return;
    const i = k.lastIndexOf(SEP);
    const sel = k.slice(PICK.length, i);
    by.set(sel, [...(by.get(sel) ?? []), `${k.slice(i + 1)}: ${v} !important;`]);
  });
  return [...by].map(([sel, body]) => `${sel} { ${body.join(' ')} }`).join('\n');
};

export const tuneCss = (values: TuneValues): string =>
  [
    ...TUNES.filter((t) => values[t.id] !== undefined).map((t) => {
      const body = Object.entries(t.decl(String(values[t.id])))
        .map(([k, v]) => `${k}: ${v} !important;`)
        .join(' ');
      return `${t.at} { ${body} }`;
    }),
    pickCss(values),
  ]
    .filter(Boolean)
    .join('\n');

const paint = (values: TuneValues) => {
  let tag = document.getElementById(KEY) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = KEY;
    document.head.appendChild(tag);
  }
  tag.textContent = tuneCss(values);
};

paint(useTune.getState().values);

const commit = (p: Partial<TuneState>) => {
  useTune.setState(p);
  const s = useTune.getState();
  paint(s.values);
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* it still works for this visit */
  }
};

export const setTune = (id: string, v: string | number) => commit({ values: { ...useTune.getState().values, [id]: v }, active: null });

export const resetTune = () => commit({ values: {}, active: DEFAULT_PRESET });

export const applyPreset = (name: string) => {
  if (name === DEFAULT_PRESET) return resetTune();
  const p = useTune.getState().presets.find((x) => x.name === name);
  if (p) commit({ values: { ...p.values }, active: name });
};

export const savePreset = () => {
  const { presets, values } = useTune.getState();
  const n = presets.reduce((m, p) => Math.max(m, Number(p.name.replace(/\D/g, '')) || 0), 0) + 1;
  const name = `Look ${n}`;
  commit({ presets: [...presets, { name, values: { ...values } }], active: name });
};

export const dropPreset = (name: string) => {
  const { presets, active } = useTune.getState();
  commit({ presets: presets.filter((p) => p.name !== name), active: active === name ? null : active });
};

/* the value a screen has now, read off a hidden element carrying the token's own classes, as a hex the picker takes */
export const liveColour = (t: ColourTune): string => {
  const el = document.createElement('div');
  el.className = t.probe;
  el.style.display = 'none';
  document.body.appendChild(el);
  const raw = getComputedStyle(el).getPropertyValue(t.prop).trim();
  el.remove();
  return toHex(raw);
};

export const toHex = (c: string): string => {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${[...c.slice(1)].map((x) => x + x).join('')}`.toLowerCase();
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return '#000000';
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    const out = String(ctx.fillStyle);
    if (out.startsWith('#')) return out;
    const m = out.match(/\d+(\.\d+)?/g);
    return m ? `#${m.slice(0, 3).map((x) => Math.round(Number(x)).toString(16).padStart(2, '0')).join('')}` : '#000000';
  } catch {
    return '#000000';
  }
};
