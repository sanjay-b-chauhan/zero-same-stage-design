/* The chat, read from the top like ChatGPT. Her words stream out a few at a time, each coming sharp from a soft blur where it
   already sits, patched straight to the DOM so nothing redraws. When you send, the question of hers you answered rises to the
   top of the view, your line under it, and her answer writes below that, about the middle, with clear space above the composer.
   Same list on the big screen and in the PIP. A remount shows finished text, nothing replays.
   When your line fills a slot she reacts on it first: one emoji springs onto your bubble's bottom right edge, the way a
   reaction sits in WhatsApp, then she answers. */
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ArrowDown, Play } from 'lucide-react';
import { softClick, softLand } from '../../audio';
import { clock } from '../../clock';
import { Loader } from '../../ds/Loader';
import { useFlow } from '../../engine/store';
import GameCard from '../../games/GameCard';
import { gameById } from '../../games/find';
import Pops from '../../pip/Pops';
import { seenLines, useSeen, type SeenItem } from '../../pip/seen';
import SeenLine from '../../pip/SeenLine';
import type { FileRef, Msg, Surface } from '../../types';
import { seenOn, useDraft } from './draft';
import FileCard, { ToolLink } from './FileCard';
import FilmPlayer from './FilmPlayer';
import VoicePill from './VoicePill';
import WaitSteps from './WaitSteps';
import { FIRM, FIRM_MS, SPRING, firstName, isTextEntry, land, prefersReduced, rise } from './util';
import { FRESH_MS, fillsOf, useReactions } from './reactions';

const ICON = { size: 16, strokeWidth: 1.75 };
const EMPTY: Msg[] = [];
const TOP_GAP = 12;
const CLEAR = 96; /* under her newest line, above the composer, while it writes past the fold */

/* an eased scroll toward a target that can move while it runs. Stops the moment you scroll yourself */
function useGlide(scroller: { current: HTMLDivElement | null }) {
  const raf = useRef(0);
  const to = useRef(0);
  const stop = () => {
    const el = scroller.current;
    if (raf.current) el?.ownerDocument.defaultView?.cancelAnimationFrame(raf.current);
    raf.current = 0;
  };
  const go = (target: number, smooth: boolean) => {
    const el = scroller.current;
    const view = el?.ownerDocument.defaultView;
    if (!el || !view) return;
    to.current = target;
    if (!smooth || prefersReduced(el)) {
      stop();
      el.scrollTop = target;
      return;
    }
    if (raf.current) return;
    let last = view.performance.now();
    const step = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const cur = el.scrollTop;
      const gap = to.current - cur;
      if (Math.abs(gap) < 0.6) {
        el.scrollTop = to.current;
        raf.current = 0;
        return;
      }
      /* critically damped toward the target: about 300 ms to settle, a moving target just keeps it going */
      el.scrollTop = cur + gap * (1 - Math.exp(-dt / 90));
      raf.current = view.requestAnimationFrame(step);
    };
    raf.current = view.requestAnimationFrame(step);
  };
  useEffect(() => stop, []);
  return { go, stop };
}

/* the tools she links right after a line, each landing at the end of her words once, on the firm spring */
function useToolsIn(p: RefObject<HTMLParagraphElement | null>, id: string, tools: FileRef[] | undefined, surface: Surface) {
  const n = tools?.length ?? 0;
  useLayoutEffect(() => {
    const seen = seenOn(surface);
    p.current?.querySelectorAll<HTMLElement>('.zs2-toollink[data-inline]').forEach((el, i) => {
      const key = `${id}:tool:${tools?.[i]?.id ?? i}`;
      if (seen.has(key)) return;
      seen.add(key);
      rise(el, { y: 6, blur: 6, scale: 0.9, ms: FIRM_MS, easing: FIRM });
      land(el.querySelector('[data-land]'), 0.4, 140, 2);
    });
  }, [n, id, surface]);
}

/* her line, one span per word. The store says how many are out; this patches data-on and never re-renders */
function Words({ m, tools, surface }: { m: Msg; tools?: FileRef[]; surface: Surface }) {
  const p = useRef<HTMLParagraphElement>(null);
  useToolsIn(p, m.id, tools, surface);
  const parts = useMemo(() => (m.text ?? '').split(/(\s+)/), [m.text]);
  const now = useFlow.getState().ui.stream;
  const live = now?.id === m.id;
  const out = live ? now.n : Number.MAX_SAFE_INTEGER;

  useLayoutEffect(() => {
    const el = p.current;
    if (!el) return;
    let words: HTMLElement[] | null = null;
    const apply = (s: { id: string; n: number } | undefined) => {
      const on = s?.id === m.id;
      if (on) el.setAttribute('data-live', '');
      else el.removeAttribute('data-live');
      if (!on) return;
      words = words ?? Array.from(el.querySelectorAll<HTMLElement>('.zs2-w'));
      for (let i = 0; i < words.length; i++) {
        if (i < s.n) words[i].setAttribute('data-on', '');
        else words[i].removeAttribute('data-on');
      }
    };
    let last = useFlow.getState().ui.stream;
    apply(last);
    return useFlow.subscribe((st) => {
      if (st.ui.stream === last) return;
      last = st.ui.stream;
      apply(last);
    });
  }, [m.id]);

  let w = 0;
  return (
    <p ref={p} className="zs2-her" data-draft={m.draft || undefined} data-sm={m.sm || undefined} data-live={live || undefined}>
      {parts.map((t, i) =>
        t === '' || /^\s+$/.test(t) ? (
          t
        ) : (
          <span key={i} className="zs2-w" data-on={w++ < out || undefined}>
            {t}
          </span>
        )
      )}
      {tools?.map((f) => (
        <span key={f.id}>
          {' '}
          <ToolLink file={f} inline />
        </span>
      ))}
    </p>
  );
}

/* the newest line of hers with keys on it: only its keys answer the number keys */
const newestKeys = (msgs: Msg[]): string | undefined => {
  for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].options?.length) return msgs[i].id;
  return undefined;
};

/* Her options, as pills you press. They arrive one after the other once her line is out, and a key that joins later rises
   in on its own. b14 (his note: "why are the pills with the white background ... make it better, like an outline"): outline
   pills on the ground, a designed hover and press, and the one you pick fills with ink while the rest step back, a beat
   before it turns into your line. In stuck mode each carries its number, the keys 1 to 9 press them and the composer is the
   next number (his words: "Option 1, option 2, option 3, and option 4 ... is nothing but the chat thing") */
const PICK_MS = 180;
function Options({ m, fresh, surface }: { m: Msg; fresh: boolean; surface: Surface }) {
  const box = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string> | null>(null);
  const choose = useFlow((s) => s.actions.choose);
  const numbered = useFlow((s) => !!s.stage?.stuckMode);
  const [picked, setPicked] = useState<string | null>(null);
  const opts = m.options!;
  const ids = opts.map((o) => o.id).join('|');

  useLayoutEffect(() => {
    const first = seen.current === null;
    const had = seen.current ?? new Set<string>();
    seen.current = new Set(opts.map((o) => o.id));
    if (first && !fresh) return;
    let k = 0;
    box.current?.querySelectorAll<HTMLElement>('.zs2-opt').forEach((el) => {
      if (had.has(el.dataset.id ?? '')) return;
      const i = k++;
      rise(el, { y: 8, blur: 4, scale: 0.96, delay: i * 60, ms: 520 });
      if (!prefersReduced(el)) clock.setTimeout(() => softLand(i), i * 60);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, fresh]);

  const pick = (id: string) => {
    if (picked) return;
    softClick();
    setPicked(id);
    const el = box.current;
    if (!el || prefersReduced(el)) choose(m.id, id);
    else clock.setTimeout(() => choose(m.id, id), PICK_MS);
  };

  /* 1 to 9 press the newest keys, the next number puts you in the composer. Typing in the composer wins, unless it is empty */
  useEffect(() => {
    const doc = box.current?.ownerDocument;
    if (!numbered || !doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || !/^[1-9]$/.test(e.key)) return;
      const st = useFlow.getState();
      if (st.ui.surface !== surface || st.ui.listening || newestKeys(st.stage?.msgs ?? []) !== m.id) return;
      const t = e.target as HTMLTextAreaElement | null;
      const composer = !!t?.classList?.contains('zs2-input');
      if (isTextEntry(t) && !(composer && !t?.value)) return;
      const n = Number(e.key);
      if (n <= opts.length) {
        e.preventDefault();
        pick(opts[n - 1].id);
      } else if (n === opts.length + 1 && !composer) {
        e.preventDefault();
        doc.querySelector<HTMLTextAreaElement>('.zs2-composer .zs2-input')?.focus({ preventScroll: true });
      }
    };
    doc.addEventListener('keydown', onKey);
    return () => doc.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numbered, ids, surface, picked, m.id]);

  return (
    <div ref={box} className="zs2-opts" data-keys={numbered || undefined} data-picking={picked ? '' : undefined}>
      {opts.map((o, i) => (
        <button
          key={o.id}
          type="button"
          className="zs2-opt"
          data-id={o.id}
          data-picked={picked === o.id || undefined}
          aria-keyshortcuts={numbered ? String(i + 1) : undefined}
          onClick={() => pick(o.id)}
        >
          {numbered && (
            <span className="zs2-opt-n z-num" aria-hidden>
              {i + 1}
            </span>
          )}
          <span className="zs2-opt-t">{o.label}</span>
        </button>
      ))}
      {numbered && m.tally && (
        <span className="zs2-opts-tally z-num" aria-label={`${m.tally.n} of ${m.tally.of} found`}>
          <span className="zs2-tally-bar" aria-hidden>
            {Array.from({ length: m.tally.of }, (_, i) => (
              <i key={i} data-on={i < m.tally!.n || undefined} />
            ))}
          </span>
          {m.tally.n} of {m.tally.of} found
        </span>
      )}
    </div>
  );
}

function FilmMsg({ m, surface }: { m: Msg; surface: Surface }) {
  const film = m.film!;
  const setPipBody = useFlow((s) => s.actions.setPipBody);
  const [replay, setReplay] = useState(false);
  if (surface === 'big' && (!film.seen || replay)) return <FilmPlayer surface="big" filmId={film.id} />;
  return (
    <button
      type="button"
      className="zs2-filmrow"
      onClick={() => {
        if (surface === 'pip') setPipBody('film');
        else setReplay(true);
      }}
    >
      <span className="zs2-filmrow-play">
        <Play {...ICON} />
      </span>
      <span className="zs2-filmrow-title">{film.title}</span>
    </button>
  );
}

/* I don't know, twice: she plays it out with you. The card is the one filled thing in the chat while it is open */
function GameMsg({ m }: { m: Msg }) {
  const game = gameById(m.game?.id);
  const light = useFlow((s) => s.ui.lightStage);
  const gameDone = useFlow((s) => s.actions.gameDone);
  if (!game || !m.game) return null;
  return <GameCard game={game} uid={m.id} done={m.game.done} dark={!light} onDone={(r) => gameDone(m.id, r)} />;
}

/* the quiet lines over each of her answers, one array per answer that keeps its identity while its words stay the same,
   so a new line in the chat never redraws the rows above it */
function useSeenRows(msgs: Msg[]): Map<string, SeenItem[]> {
  const frames = useSeen((s) => s.frames);
  const sent = useSeen((s) => s.sent);
  const reactions = useReactions();
  const fills = useMemo(() => fillsOf(reactions), [reactions]);
  const manager = useFlow((s) => firstName(s.project?.manager.name ?? 'her'));
  const kept = useRef(new Map<string, { sig: string; items: SeenItem[] }>());
  return useMemo(() => {
    const fresh = seenLines(msgs, frames, sent, manager, fills);
    const out = new Map<string, SeenItem[]>();
    const next = new Map<string, { sig: string; items: SeenItem[] }>();
    fresh.forEach((items, id) => {
      const sig = items.map((x) => `${x.key}:${x.label}:${x.frame?.url.length ?? 0}`).join('|');
      const was = kept.current.get(id);
      const use = was && was.sig === sig ? was.items : items;
      next.set(id, { sig, items: use });
      out.set(id, use);
    });
    kept.current = next;
    return out;
  }, [msgs, frames, sent, manager, fills]);
}

/* her one emoji on your line, on its bottom right edge like a WhatsApp reaction (his note, b14). Fresh, it springs up out of
   the edge with one firm overshoot and a little turn; on a remount it is just there */
function Reaction({ m }: { m: Msg }) {
  const r = useReactions((s) => s[m.id]);
  const el = useRef<HTMLSpanElement>(null);
  const shown = r && r.msgAt === m.at ? r : undefined;
  useLayoutEffect(() => {
    const node = el.current;
    if (!node || !shown || Date.now() - shown.at > FRESH_MS || prefersReduced(node)) return;
    node.animate(
      [
        { transform: 'translateY(6px) scale(0.2) rotate(-20deg)', filter: 'blur(4px)' },
        { transform: 'translateY(0) scale(1) rotate(0deg)', filter: 'blur(0px)' },
      ],
      { duration: FIRM_MS, easing: FIRM, fill: 'backwards' }
    );
  }, [shown]);
  if (!shown) return null;
  return (
    <span ref={el} className="zs2-react" role="img" aria-label="She reacted">
      {shown.e}
    </span>
  );
}

const Row = memo(function Row({
  m,
  prev,
  surface,
  room,
  seen,
  tools,
}: {
  m: Msg;
  prev?: Msg;
  surface: Surface;
  room: boolean;
  seen?: SeenItem[];
  tools?: FileRef[];
}) {
  const el = useRef<HTMLDivElement>(null);
  const clip = useDraft((s) => (m.text ? s.clips[m.text] : undefined));
  const [freshOpts] = useState(() => !m.options);

  /* a line she writes is already arriving word by word, so only the rest rise in, once per surface */
  useLayoutEffect(() => {
    const seen = seenOn(surface);
    if (seen.has(m.id)) return;
    seen.add(m.id);
    const streaming = useFlow.getState().ui.stream?.id === m.id;
    /* a file lands on the firm spring, the rest rise in. A tool she links rises like her words, its logo lands */
    if (m.file && m.file.kind !== 'link') {
      rise(el.current, { y: 12, blur: 6, scale: 0.94, ms: FIRM_MS, easing: FIRM });
      land(el.current?.querySelector('[data-land]') ?? null, 0.5, 120, 2);
    } else if (m.rule) {
      /* b14 the stuck mode line: its words come sharp, its hairlines grow out from them to the edges */
      rise(el.current?.querySelector('.zs2-rule-t') ?? null, { y: 4, blur: 6, scale: 0.96, ms: 520 });
      el.current?.querySelectorAll<HTMLElement>('.zs2-rule-l').forEach((ln) => {
        if (prefersReduced(ln)) return;
        ln.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 640, delay: 80, easing: SPRING, fill: 'backwards' });
      });
    } else if (!streaming) {
      rise(el.current, { y: 10, blur: 6, scale: 0.99, ms: 560 });
      if (m.file) land(el.current?.querySelector('[data-land]') ?? null, 0.5, 120, 2);
    }
  }, [m.id, surface]);

  const turn = !!prev && prev.from !== m.from;
  /* her tool link reads as part of what she just said, so it sits close under it */
  const link = m.from === 'her' && m.file?.kind === 'link' && !m.text;
  const ownVoice = m.from === 'me' && m.voiced && room;
  const plain = m.text && !m.voice;
  /* your own words or file, not a system line */
  const mine = m.from === 'me' && !m.sys && !m.voice && !m.film && !m.game;

  return (
    <div
      ref={el}
      className="zs2-row"
      data-mid={m.id}
      data-from={m.from}
      data-turn={turn || undefined}
      data-game={m.game ? '' : undefined}
      data-link={link || undefined}
      data-rule={m.rule || undefined}
    >
      {seen && seen.length > 0 && m.from === 'her' && <SeenLine id={m.id} items={seen} />}
      {m.voice && (
        <VoicePill
          id={m.id}
          surface={surface}
          url={m.voice.url}
          dur={m.voice.dur}
          text={m.voice.text}
        />
      )}
      {mine ? (
        <div className="zs2-mewrap">
          {ownVoice ? (
            surface === 'big' ? (
              <VoicePill
                id={m.id}
                surface={surface}
                own
                url={clip?.url}
                dur={clip?.dur ?? Math.max(2, Math.round((m.text ?? '').split(/\s+/).length / 2.4))}
                text={m.text}
              />
            ) : (
              <p className="zs2-mine" data-sm={m.sm || undefined}>{m.text}</p>
            )
          ) : (
            plain && (
              <p className="zs2-mine" data-stuck={m.stuck || undefined} data-sm={m.sm || undefined}>
                {m.text}
              </p>
            )
          )}
          {m.file && <FileCard file={m.file} surface={surface} />}
          <Reaction m={m} />
        </div>
      ) : (
        plain &&
        (m.rule ? (
          <div className="zs2-rule" role="separator" aria-label={m.text}>
            <i className="zs2-rule-l" data-side="l" aria-hidden />
            <span className="zs2-rule-t">{m.text}</span>
            <i className="zs2-rule-l" data-side="r" aria-hidden />
          </div>
        ) : m.sys ? (
          <p className="zs2-sys">{m.text}</p>
        ) : (
          <Words m={m} tools={tools} surface={surface} />
        ))
      )}
      {!mine && m.file && <FileCard file={m.file} surface={surface} />}
      {m.film && <FilmMsg m={m} surface={surface} />}
      {m.game && <GameMsg m={m} />}
      {m.options && m.options.length > 0 && <Options m={m} fresh={freshOpts} surface={surface} />}
    </div>
  );
});

/* she is really waiting on something slow: only after 2 s, and it names the work */
function Waiting() {
  const el = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    rise(el.current, { y: 8, blur: 4, ms: 420 });
  }, []);
  return (
    <div ref={el} className="zs2-row zs2-waiting">
      <Loader label="Checking your link" />
    </div>
  );
}

export default function Thread({ surface }: { surface: Surface }) {
  const msgs = useFlow((s) => s.stage?.msgs ?? EMPTY);
  const typing = useFlow((s) => s.stage?.typing ?? false);
  const waiting = useFlow((s) => !!s.stage?.wait);
  const phase = useFlow((s) => s.stage?.phase ?? 'work');

  const box = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const spacer = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const anchor = useRef<string | null>(null);
  const known = useRef<Set<string> | null>(null);
  const lastTop = useRef(0);
  const [away, setAway] = useState(false);
  const glide = useGlide(scroller);

  /* the POU is its own room: on the big screen the voice exchange stands alone. Nothing is lost, the store keeps it all. */
  const room = phase === 'pou' || phase === 'done';
  const pouFrom = useDraft((s) => s.pouFrom);
  const visible = useMemo(() => {
    if (!room) return msgs;
    return pouFrom > 0 ? msgs.slice(pouFrom) : msgs.slice(-2);
  }, [msgs, room, pouFrom]);
  /* b13: a tool she links straight after her line is part of that line ("Open in Claude" inside her words), so its own
     row is not drawn. One array per line, kept while its tools stay the same, so the memo rows do not redraw */
  const toolCache = useRef(new Map<string, FileRef[]>());
  const tools = useMemo(() => {
    const at = new Map<string, FileRef[]>();
    const rode = new Set<string>();
    let host: Msg | undefined;
    for (const m of visible) {
      const f = m.from === 'her' && !m.text && m.file?.kind === 'link' && m.file.url && !m.file.mine ? m.file : undefined;
      if (f && host) {
        at.set(host.id, [...(at.get(host.id) ?? []), f]);
        rode.add(m.id);
        continue;
      }
      host = m.from === 'her' && m.text && !m.voice && !m.sys && !m.file && !m.options?.length ? m : undefined;
    }
    const cache = toolCache.current;
    at.forEach((list, id) => {
      const had = cache.get(id);
      if (had && had.length === list.length && had.every((f, i) => f === list[i])) at.set(id, had);
      else cache.set(id, list);
    });
    return { at, rode };
  }, [visible]);

  const seenRows = useSeenRows(msgs);

  /* into the POU room and out: the thread lands in its new shape, sharp from a blur */
  const wasRoom = useRef(room);
  useLayoutEffect(() => {
    if (wasRoom.current === room) return;
    wasRoom.current = room;
    if (phase === 'done') return;
    rise(column.current, { y: 18, blur: 8, scale: 0.985, ms: 640 });
  }, [room, phase]);

  /* whatever is here when this surface mounts is old news */
  useState(() => {
    const seen = seenOn(surface);
    visible.forEach((m) => seen.add(m.id));
    return 0;
  });

  /* where things are, measured against the column, never the spacer */
  const layout = () => {
    const el = scroller.current;
    const col = column.current;
    if (!el || !col) return null;
    const pad = parseFloat(el.ownerDocument.defaultView?.getComputedStyle(el).paddingTop ?? '0') || 0;
    return { el, col, viewH: el.clientHeight, contentH: col.offsetHeight + pad, pad };
  };

  const rowTop = (id: string | null): number | null => {
    if (!id) return null;
    const row = column.current?.querySelector<HTMLElement>(`[data-mid="${id}"]`);
    return row ? row.offsetTop : null;
  };

  /* room under the exchange, so it can rise to the top even in a short thread */
  const fitSpacer = () => {
    const L = layout();
    const sp = spacer.current;
    if (!L || !sp) return;
    const top = rowTop(anchor.current);
    const need = top === null ? 0 : Math.max(CLEAR, L.viewH - (L.contentH - top) - TOP_GAP);
    sp.style.height = `${need}px`;
  };

  /* After you send, the view holds three things: her question, your reply, her answer. Her question sits at the top, so her
     answer lands about the middle with clear space under it. Once she writes past that, the view follows her, gently. Never up */
  const settle = (smooth: boolean) => {
    const L = layout();
    if (!L) return;
    fitSpacer();
    const top = rowTop(anchor.current);
    let want = L.el.scrollTop;
    if (top !== null) want = Math.max(want, top - TOP_GAP);
    if (pinned.current) want = Math.max(want, L.contentH - L.viewH + (top === null ? 16 : CLEAR));
    want = Math.min(want, L.el.scrollHeight - L.viewH);
    if (Math.abs(want - L.el.scrollTop) < 1) return;
    glide.go(want, smooth);
  };

  /* the line of hers you answered: the nearest of hers above yours, or yours if she had not spoken */
  const askedOf = (i: number): string | null => {
    for (let j = i - 1; j >= 0; j--) {
      if (visible[j].from === 'her') return visible[j].id;
      if (visible[j].from === 'me') break;
    }
    return visible[i]?.id ?? null;
  };

  /* a new line: yours anchors the exchange, hers just arrives */
  useLayoutEffect(() => {
    const first = known.current === null;
    const set = known.current ?? new Set<string>();
    let mineNew: string | null = null;
    let any = false;
    for (const m of visible) {
      if (set.has(m.id)) continue;
      set.add(m.id);
      any = true;
      if (m.from === 'me') mineNew = m.id;
    }
    known.current = set;
    if (first) {
      for (let i = visible.length - 1; i >= 0; i--)
        if (visible[i].from === 'me') {
          anchor.current = askedOf(i);
          break;
        }
      settle(false);
      return;
    }
    if (mineNew) {
      anchor.current = askedOf(visible.findIndex((m) => m.id === mineNew));
      pinned.current = true;
      setAway(false);
    }
    if (!any && !typing) return;
    if (!pinned.current && !mineNew) {
      setAway(true);
      return;
    }
    settle(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, typing, waiting]);

  /* words arriving, a card loading its picture, a panel pushing in: keep the latest in view if we were on it */
  useEffect(() => {
    const col = column.current;
    const el = scroller.current;
    if (!col || !el) return;
    const View = col.ownerDocument.defaultView as (Window & typeof globalThis) | null;
    const RO = View?.ResizeObserver ?? ResizeObserver;
    const ro = new RO(() => {
      if (pinned.current) settle(true);
      else fitSpacer();
    });
    ro.observe(col);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    const L = layout();
    if (!L) return;
    const top = L.el.scrollTop;
    const wentUp = top < lastTop.current - 1;
    lastTop.current = top;
    const near = L.contentH - (top + L.viewH) < 28;
    if (wentUp) glide.stop();
    if (near) {
      pinned.current = true;
      if (away) setAway(false);
    } else if (wentUp) pinned.current = false;
  };

  /* a wheel or a finger going up wins at once, before the scroll event */
  const letGo = (up: boolean) => {
    if (!up) return;
    glide.stop();
    pinned.current = false;
  };

  return (
    <div ref={box} className="zs2-thread" data-surface={surface}>
      <div
        ref={scroller}
        className="zs2-thread-scroll"
        onScroll={onScroll}
        onWheel={(e) => letGo(e.deltaY < 0)}
        onTouchStart={() => letGo(true)}
      >
        <div ref={column} className="zs2-thread-col">
          {visible.map((m, i) =>
            tools.rode.has(m.id) ? null : (
              <Row key={m.id} m={m} prev={visible[i - 1]} surface={surface} room={room} seen={seenRows.get(m.id)} tools={tools.at.get(m.id)} />
            )
          )}
          {waiting && <WaitSteps />}
          {typing && <Waiting />}
        </div>
        <div ref={spacer} className="zs2-thread-spacer" aria-hidden />
      </div>
      {away && (
        <button
          type="button"
          className="zs2-latest"
          aria-label="Go to the latest message"
          onClick={() => {
            pinned.current = true;
            setAway(false);
            const L = layout();
            if (L) glide.go(Math.min(L.el.scrollHeight - L.viewH, L.contentH - L.viewH + CLEAR), true);
          }}
        >
          <ArrowDown {...ICON} />
        </button>
      )}
      {surface === 'big' && <Pops root={box} />}
    </div>
  );
}
