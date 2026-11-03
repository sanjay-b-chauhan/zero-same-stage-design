#!/usr/bin/env node
/* Free local Kokoro only, one run at a time, same method as zero-stage/_src/b1/voice.mjs. Never paid, never stretched or padded: cut and level only.
   Takes are cached by voice and text, and b1's cached takes are reused when the words match.
   usage:
     node tools/make_takes.mjs takes     every line in content/lines.ts, static/takes/*.mp3 + content/takes.manifest.json
     node tools/make_takes.mjs kickoff   the meetings: static/kickoff/<p>/*.mp3, static/kickoff/<p>/visual.html, data/run_<p>.json
     node tools/make_takes.mjs decks     only rebuild the decks
   Env WORDS=1 aligns cues with Whisper word times (free, local). Without it a cue sits at its proportional place in the line. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { LINES } from '../content/lines.ts';
import { KICKOFFS } from './kickoff_script.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE = path.join(ROOT, 'tools/.wav');
const B1_CACHE = '/Users/sanjaychauhan/claudecode/zero-stage/_src/b1/takes';
const REF_DECK = path.join(ROOT, 'data/ref/airbnb_visual.html');
fs.mkdirSync(CACHE, { recursive: true });

const VOICES = { eryn: 'af_heart', aaron: 'am_michael' };
const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return h.toString(36); };
const run = (cmd, args, opt = {}) => { const r = spawnSync(cmd, args, { encoding: 'utf8', ...opt }); if (r.status !== 0) { console.error(cmd, args.join(' '), '\n', r.stderr || r.stdout); process.exit(1); } return r.stdout; };
const dur = (f) => parseFloat(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim());
const round = (n) => +n.toFixed(3);
const noDash = (s, where) => { if (/[\u2013\u2014]/.test(s)) { console.error('dash in', where, s); process.exit(1); } };

/* one line of text, one wav. b1's cache first, then ours, then one Kokoro run. */
const take = (voice, text) => {
  noDash(text, 'line');
  const id = hash(voice + text);
  const b1 = path.join(B1_CACHE, id + '.wav');
  if (fs.existsSync(b1)) return b1;
  const wav = path.join(CACHE, id + '.wav');
  if (fs.existsSync(wav)) return wav;
  const txt = path.join(CACHE, id + '.txt');
  fs.writeFileSync(txt, text);
  /* Kokoro can fail under load, so one more try before giving up. A half written file never stays in the cache. */
  for (let tryNo = 1; tryNo <= 2; tryNo++) {
    const r = spawnSync('npx', ['--yes', 'hyperframes', 'tts', txt, '--voice', voice, '-s', '0.94', '--output', wav], { cwd: CACHE, encoding: 'utf8' });
    if (r.status === 0 && fs.existsSync(wav)) break;
    if (fs.existsSync(wav)) fs.unlinkSync(wav);
    if (tryNo === 2) { console.error('kokoro failed twice on:', text, '\n', r.stderr || r.stdout); process.exit(1); }
    console.log('retry', voice, text.slice(0, 60));
  }
  console.log('took', voice, text.slice(0, 60));
  return wav;
};
/* single pass level, nothing stretched */
const level = ['-af', 'loudnorm=I=-18:TP=-2:LRA=9', '-ar', '44100', '-ac', '1', '-b:a', '96k'];

function makeTakes() {
  const out = path.join(ROOT, 'static/takes');
  fs.mkdirSync(out, { recursive: true });
  const manifest = {};
  const seen = new Set();
  for (const l of LINES) {
    const key = `${l.voice}|${l.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const voice = VOICES[l.voice];
    const wav = take(voice, l.text);
    const takeId = `${l.voice}-${hash(l.text)}`;
    const mp3 = path.join(out, `${takeId}.mp3`);
    if (!fs.existsSync(mp3) || fs.statSync(mp3).mtimeMs < fs.statSync(wav).mtimeMs) run('ffmpeg', ['-y', '-v', 'error', '-i', wav, ...level, mp3]);
    manifest[key] = { takeId, url: `static/takes/${takeId}.mp3`, dur: round(dur(mp3)) };
    fs.writeFileSync(path.join(ROOT, 'content/takes.manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  }
  console.log('takes', Object.keys(manifest).length);
}

/* ---------- the deck: the real generated deck's CSS and engine, verbatim. Only title, brand tokens, logo and panels change ---------- */
const swap = (s, from, to, label) => {
  const n = s.split(from).length - 1;
  if (n < 1) { console.error('anchor not found:', label || from); process.exit(1); }
  return s.split(from).join(to);
};
function makeDeck(pid) {
  const k = KICKOFFS[pid];
  const t = k.tokens;
  let s = fs.readFileSync(REF_DECK, 'utf8');
  s = swap(s, 'Reducing Host Cancellations at Airbnb', k.title, 'title');
  s = swap(s, `--brand:#FF385C; --accent:#FF385C;`, `--brand:${t.brand}; --accent:${t.brand};`, 'root brand');
  s = swap(s, `--good:#00A699; --good-tint:rgba(0,166,153,.14);`, `--good:${t.brand}; --good-tint:${t.brand}24;`, 'root good');
  s = swap(s, `--bad:#FF385C;  --bad-tint:rgba(255,56,92,.14);`, `--bad:#FF6B6B;  --bad-tint:rgba(255,107,107,.14);`, 'root bad');
  s = swap(s, `--hero:#FF385C; --hero-gradient:linear-gradient(135deg,#FF385C 0%,#BD1E59 100%);`, `--hero:${t.brand}; --hero-gradient:linear-gradient(135deg,${t.brand} 0%,${t.brand2} 100%);`, 'root hero');
  s = swap(s, `--on-hero:#FFFFFF; --on-hero-dim:rgba(255,255,255,.85); --on-hero-em:#FFFFFF;`, `--on-hero:${t.onHero}; --on-hero-dim:${t.onHeroDim}; --on-hero-em:${t.onHero};`, 'root on-hero');
  s = swap(s, 'background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.35);', `background:${t.pillBg};border:1px solid ${t.pillLine};`, 'pillnote');

  /* the second token block, the one the generator writes for a brand */
  const a = s.indexOf('<!-- brand asset overrides -->');
  const b = s.indexOf('</style>', a);
  if (a < 0 || b < 0) { console.error('brand block not found'); process.exit(1); }
  const brandBlock = `<!-- brand asset overrides -->
<style>
  :root {
    --green-500: ${t.brand};
    --green-700: ${t.brand3};
    --green-800: ${t.brand3};
    --green-900: ${t.brand3};
    --green-400: ${t.brand2};
    --green-200: ${t.brand2};
    --green-100: #222222;
    --green-50: #141414;
    --bg: #222222;
    --bad: #FF6B6B;
    --ink: #FFFFFF;
    --good: ${t.brand};
    --hero: ${t.brand};
    --meta: rgba(255,255,255,.55);
    --tile: #333333;
    --brand: ${t.brand};
    --label: #B3B3B3;
    --accent: ${t.brand};
    --bad-tint: rgba(255,107,107,.14);
    --good-tint: ${t.brand}24;
    --hero-gradient: linear-gradient(135deg,${t.brand} 0%,${t.brand2} 100%);
  }
  /* brand logo, replaces the text wordmark on every panel */
  .wordmark{
    display: inline-flex !important;
    align-items: center !important;
    gap: clamp(8px, 1.4cqmin, 16px) !important;
    /* hide the literal text node; kept in DOM for a11y */
    font-size: 0 !important;
    color: transparent !important;
    line-height: 1 !important;
    overflow: visible !important;
    white-space: nowrap !important;
  }
  .wordmark::before{
    content: "" !important;
    display: inline-block !important;
    background-image: url("${k.logo}") !important;
    background-repeat: no-repeat !important;
    background-position: left center !important;
    background-size: contain !important;
    width: clamp(30px, 4.5cqmin, 56px) !important;
    height: clamp(30px, 4.5cqmin, 56px) !important;
    flex-shrink: 0 !important;
    filter: ${t.logoFilter} !important;
  }
  /* cover and hero panels, bigger logo */
  .panel.fill .wordmark::before{
    width: clamp(38px, 5.5cqmin, 68px) !important;
    height: clamp(38px, 5.5cqmin, 68px) !important;
    filter: ${t.logoFilterFill} !important;
  }
  /* the real pause card rises 305 high from the foot of the deck. The panel a segment stops on sits clear above it */
  .panel.above-card{padding-bottom:325px}
`;
  s = s.slice(0, a) + brandBlock + s.slice(b);

  /* the panels */
  const open = '<div class="mode mode-concept active" id="mode-concept">';
  const i = s.indexOf(open);
  const j = s.indexOf('</main>');
  if (i < 0 || j < 0) { console.error('panels block not found'); process.exit(1); }
  s = s.slice(0, i + open.length) + '\n' + k.panels(k.company) + '\n  </div>\n' + s.slice(j);

  /* house rule: no em or en dash, even in a comment */
  s = s.replace(/\s*[\u2013\u2014]\s*/g, ', ');
  for (const bad of ['Airbnb', 'FF385C', 'BD1E59', 'B22740', 'FF4F6F', 'BF2A45', 'brandfetch']) if (s.includes(bad)) { console.error('left over in deck:', bad); process.exit(1); }

  /* every cue must point at something real */
  for (const seg of k.segments) for (const l of seg.lines) for (const c of l.cues || []) if (!s.includes(`id="${c.id}"`)) { console.error('cue with no element:', c.id); process.exit(1); }

  const dir = path.join(ROOT, 'static/kickoff', pid);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'visual.html'), s);
  console.log('deck', pid);
}

/* ---------- word times, for cues in the middle of a line ---------- */
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
function wordsOf(mp3) {
  if (!process.env.WORDS) return [];
  const dir = path.join(CACHE, 'whisper', hash(mp3 + fs.statSync(mp3).size));
  const json = path.join(dir, 'transcript.json');
  if (!fs.existsSync(json)) {
    fs.mkdirSync(dir, { recursive: true });
    run('npx', ['--yes', 'hyperframes', 'transcribe', mp3, '--dir', dir, '--engine', 'whisper', '--model', 'small.en'], { cwd: dir, timeout: 300000 });
  }
  const raw = JSON.parse(fs.readFileSync(json, 'utf8'));
  const list = Array.isArray(raw) ? raw : raw.words || [];
  return list.map((w) => ({ w: norm(w.text ?? w.word ?? ''), start: +(w.start ?? w.start_sec ?? 0) }));
}
/* where a phrase starts: Whisper's word if it heard it inside the line, else its proportional place */
function timeOf(phrase, line, words) {
  const toks = line.t.split(/\s+/);
  const want = phrase.split(/\s+/).map(norm);
  let k = -1;
  for (let i = 0; i <= toks.length - want.length && k < 0; i++) if (want.every((w, j) => norm(toks[i + j]) === w)) k = i;
  if (k < 0) { console.error(`cue phrase "${phrase}" is not in "${line.t}"`); process.exit(1); }
  const frac = line.t.split(/\s+/).slice(0, k).join(' ').length / line.t.length;
  const guess = line.start + frac * (line.end - line.start);
  const hit = words.filter((w) => w.start >= line.start - 0.25 && w.start <= line.end && w.w === want[0]).sort((a, b) => Math.abs(a.start - guess) - Math.abs(b.start - guess))[0];
  return round(hit ? hit.start : guess);
}

/* ---------- a meeting: one combined mp3 a segment, joined as the takes came out, so every cue is exact ---------- */
function makeKickoff(pid) {
  const k = KICKOFFS[pid];
  makeDeck(pid);
  const dir = path.join(ROOT, 'static/kickoff', pid);
  const segments = [];
  let total = 0;
  let all = [];
  const scenePlan = [];
  k.segments.forEach((seg, sIdx) => {
    const beat = sIdx + 1;
    let t = 0;
    const parts = [];
    const lines = seg.lines.map((l) => {
      const wav = take(k.voice, l.t);
      const d = dur(wav);
      parts.push(wav);
      const row = { ...l, start: t, end: t + d };
      t += d;
      return row;
    });
    const list = path.join(CACHE, `${pid}-${seg.id}.list`);
    fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));
    const mp3 = path.join(dir, `${seg.id}.mp3`);
    run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, ...level, mp3]);
    const segDur = round(dur(mp3));
    const url = `static/kickoff/${pid}/${seg.id}.mp3`;
    const words = wordsOf(mp3);
    const cues = [{ args: { id: seg.open }, action: 'set_panel', anchor: `_synthetic_open_${seg.id}`, time_sec: 0 }];
    for (const l of lines) for (const c of l.cues || []) {
      const at = c.on ? timeOf(c.on, l, words) : round(l.start);
      const anchor = `b${beat}_${String(c.on || c.id).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      cues.push({ args: { id: c.id }, action: c.a, anchor, time_sec: at });
    }
    cues.sort((a, b) => a.time_sec - b.time_sec);
    scenePlan.push({ beat, name: seg.id, segment: seg.id, panels: [...new Set(cues.filter((c) => c.action === 'set_panel').map((c) => c.args.id))].map((id) => ({ id })) });
    segments.push({
      id: seg.id,
      seq: sIdx,
      cues,
      file: null,
      label: seg.label,
      lines: lines.map((l, i) => ({
        seq: i,
        text: l.t,
        slide: null,
        end_sec: round(l.end),
        line_id: `${seg.id}_line_${i}`,
        audio_url: url,
        highlight: null,
        start_sec: round(l.start),
        speaker_id: k.person.id,
        audio_status: 'segment_level',
        context_point_id: l.ctx ?? null,
      })),
      video: null,
      avatar_cues: null,
      render_mode: null,
      audio_status: 'segment_level',
      segment_type: null,
      intro_video_url: null,
      audio_duration_sec: segDur,
      completion_acknowledgement: null,
      segment_combined_audio_url: url,
    });
    total += segDur;
    all = all.concat(seg.lines.map((l) => l.t));
    console.log(pid, seg.id, segDur + 's', `${seg.lines.length} lines`, `${cues.length} cues`);
  });
  for (const p of k.points) noDash(p.description, 'point');
  const ctxUsed = new Set(k.segments.flatMap((s) => s.lines.map((l) => l.ctx).filter(Boolean)));
  for (const p of k.points) if (!ctxUsed.has(p.id)) { console.error('point never spoken:', p.id); process.exit(1); }
  const cast = [{ lane: 'facilitator', name: k.person.name, person_id: k.person.id }];
  const now = '2026-11-01T00:00:00+00:00';
  const row = {
    id: k.runId,
    scenario_id: k.scenarioId,
    run_id: `${k.scenarioId}_${hash(pid)}_medium_20261101_000000`,
    duration_preset: 'medium',
    script_status: 'ready',
    audio_status: 'ready',
    total_duration_sec: round(total),
    combined_audio_url: null,
    output_raw_url: all.join('\n'),
    cast,
    context_points: k.points,
    lines: {
      cast,
      version: 'v2',
      segments,
      html_visual: { template_url: `static/kickoff/${pid}/visual.html` },
      render_mode: 'html_video_v1',
      slide_theme: { color: pid, primary_hex: k.tokens.brand, secondary_hex: k.tokens.brand2 },
      visual_mode: 'html',
      context_points: k.points,
    },
    error_code: null,
    error_message: null,
    generated_at: now,
    updated_at: now,
    metadata: {
      pacing: { duration_preset: 'medium', total_lines_target: all.length, target_duration_sec: Math.round(total) },
      last_error: null,
      scene_plan: scenePlan,
      output_mode: 'html',
      company_name: k.company,
      speaker_name: k.person.name,
      speaker_role: k.person.role,
      scenario_title: k.title,
      avatar_initials: k.person.initials,
    },
  };
  fs.writeFileSync(path.join(ROOT, `data/run_${pid}.json`), JSON.stringify(row, null, 1) + '\n');
  console.log(pid, 'total', round(total) + 's');
}

/* plan: every wav still missing, meetings first, as JSON for tools/kokoro_batch.py (one model load, one run) */
function plan() {
  const seen = new Set();
  const todo = [];
  const want = (voice, text) => {
    noDash(text, 'line');
    const id = hash(voice + text);
    if (seen.has(id)) return;
    seen.add(id);
    if (fs.existsSync(path.join(B1_CACHE, id + '.wav')) || fs.existsSync(path.join(CACHE, id + '.wav'))) return;
    todo.push({ voice, text, out: path.join(CACHE, id + '.wav') });
  };
  for (const pid of ['spotify', 'amazon']) for (const seg of KICKOFFS[pid].segments) for (const l of seg.lines) want(KICKOFFS[pid].voice, l.t);
  for (const l of LINES) want(VOICES[l.voice], l.text);
  fs.writeFileSync(path.join(CACHE, 'plan.json'), JSON.stringify(todo, null, 1));
  console.log('missing', todo.length);
}

const mode = process.argv[2] || 'all';
if (mode === 'plan') plan();
if (mode === 'takes' || mode === 'all') makeTakes();
if (mode === 'kickoff' || mode === 'all') { makeKickoff('spotify'); makeKickoff('amazon'); }
if (mode === 'decks') { makeDeck('spotify'); makeDeck('amazon'); }
