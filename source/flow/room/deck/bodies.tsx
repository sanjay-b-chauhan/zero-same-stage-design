/* One template per kind of object. All data driven from panels.ts. */
import { Check, DoorOpen, Link2, MapPin, Tag, TrendingUp, User, Volume, Volume1, Volume2 } from 'lucide-react';
import { useMemo } from 'react';
import type { Body, CompareCard, DialStep, MarketCell, PageRow, PriceTable, RawTable, RoadRow, SayStep, Stat } from './panels';
import { cx, Em, hasEm, R, Swap, useDeck } from './parts';

export function StatRow({ stat }: { stat: Stat }) {
  return (
    <div className="dk-stat">
      <R as="span" id={stat.numId} className="dk-num">
        {stat.num}
      </R>
      <R as="span" id={stat.lblId} className="dk-lbl">
        {stat.lbl}
      </R>
    </div>
  );
}

/* one line whose text follows her words */
export function Say({ steps, big }: { steps: SayStep[]; big?: boolean }) {
  const { has } = useDeck();
  let text = '';
  steps.forEach((s) => {
    if (has(s.when)) text = s.text;
  });
  return (
    <div className="dk-words">
      <Swap k={text} kind="words" layerClass="dk-wl">
        <p className={big ? cx('dk-a', hasEm(text) && 'dk-two') : 'dk-say'}>
          <Em text={text} />
        </p>
      </Swap>
    </div>
  );
}

function Title({ b }: { b: Extract<Body, { t: 'title' }> }) {
  const line = cx('dk-a', hasEm(b.line) && 'dk-two');
  return (
    <div className="dk-cover">
      <span className="zj-lg zj-l">
        <img src={b.logo} alt="" draggable={false} />
      </span>
      <p className="dk-meta">
        <span className="dk-minface">
          <img src={b.face} alt="" draggable={false} />
        </span>
        {b.sub}
      </p>
      {b.lineOn ? (
        <R as="p" id={b.lineOn} className={cx(line, 'dk-cover-l')}>
          <Em text={b.line} />
        </R>
      ) : (
        <p className={cx(line, 'dk-cover-l')}>
          <Em text={b.line} />
        </p>
      )}
    </div>
  );
}

/* the analogy, drawn: the price is a volume. Each step of her words turns it up, the price follows, and too far the room empties */
const SPEAKER = [Volume, Volume1, Volume2, Volume2];
const ICO = { strokeWidth: 1.5 };

function Crowd({ n, out, door }: { n: number; out: number; door?: boolean }) {
  return (
    <span className="dk-crowd">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="dk-pp" data-out={i >= n - out ? '1' : '0'} style={{ transitionDelay: `${(i - (n - out)) * 90}ms` }}>
          <User size={24} {...ICO} />
        </span>
      ))}
      {door && (
        <span className="dk-door" data-on={out > 0 ? '1' : '0'}>
          <DoorOpen size={24} {...ICO} />
        </span>
      )}
    </span>
  );
}

function VolumeScene({ steps, prices, walkOn }: { steps: DialStep[]; prices: string[]; walkOn: string }) {
  const { has } = useDeck();
  let lv = 0;
  steps.forEach((s) => {
    if (has(s.when)) lv = s.value;
  });
  const Speaker = SPEAKER[lv] ?? Volume;
  return (
    <div className="dk-vol">
      <div className="dk-vol-row">
        <span className="dk-vol-o">
          <span className="dk-vol-i">
            <Tag size={28} {...ICO} />
          </span>
          <span className="dk-vol-pw">
            <Swap k={prices[lv] ?? ''} kind="words" layerClass="dk-vol-pl">
              <span className="dk-vol-p">{prices[lv]}</span>
            </Swap>
          </span>
        </span>
        <span className="dk-vol-l" aria-hidden />
        <span className="dk-vol-o" data-lv={lv}>
          <span className="dk-vol-i">
            <Speaker size={28} {...ICO} />
          </span>
          <span className="dk-bars" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <i key={i} data-on={i <= lv ? '1' : '0'} data-hot={lv === 3 && i === 3 ? '1' : '0'} />
            ))}
          </span>
        </span>
      </div>
      <Crowd n={5} out={has(walkOn) ? 2 : 0} door />
    </div>
  );
}

/* the six markets at rest, then each one goes up on the cue, at its real price */
function Markets({ turnOn, cells }: { turnOn: string; cells: MarketCell[] }) {
  const { has } = useDeck();
  const on = has(turnOn);
  return (
    <div className="dk-mks">
      {cells.map((c, i) => (
        <span className="dk-mkc" key={c.code} data-on={on ? '1' : '0'} style={{ transitionDelay: `${i * 80}ms` }}>
          <span className="dk-mkc-c">{c.code}</span>
          <span className="dk-mkc-p">{c.price}</span>
          <span className="dk-mkc-u" style={{ transitionDelay: `${120 + i * 80}ms` }}>
            <TrendingUp size={14} strokeWidth={1.75} />
          </span>
        </span>
      ))}
    </div>
  );
}

function Compare({ cards }: { cards: CompareCard[] }) {
  const { has } = useDeck();
  return (
    <div className="dk-pair">
      {cards.map((c) => {
        const on = has(c.id);
        return (
          <div key={c.id} className="zj-card dk-cc">
            <Crowd n={4} out={on ? c.left : 0} />
            <R as="span" id={c.id} className="dk-cc-t">
              {c.title}
            </R>
          </div>
        );
      })}
    </div>
  );
}

function RawCard({ markOn, table }: { markOn: string; table: RawTable }) {
  const { has } = useDeck();
  const marked = has(markOn);
  let bad = 0;
  return (
    <div className="dk-raw">
      <div className="dk-raw-h">
        <span className="dk-raw-n">{table.name}</span>
        <span>{table.meta}</span>
      </div>
      <table className="dk-tb">
        <colgroup>
          <col style={{ width: 30 }} />
          <col style={{ width: 106 }} />
          <col style={{ width: 128 }} />
          <col style={{ width: 92 }} />
          <col style={{ width: 62 }} />
          <col style={{ width: 92 }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th aria-label="Row" />
            {table.cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.n}>
              <td className="dk-rown">{r.n}</td>
              {r.cells.map((c, i) => {
                if (!c.bad) return <td key={i}>{c.text}</td>;
                const k = bad++;
                return (
                  <td key={i}>
                    <span data-on={markOn} data-st={45} className={cx('dk-bad', marked && 'on')} style={{ transitionDelay: `${k * 45}ms` }}>
                      {c.text}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* first her line alone, then on "mess" the real file takes its place */
function Raw({ b }: { b: Extract<Body, { t: 'raw' }> }) {
  const { has } = useDeck();
  const gate = has(b.land);
  return (
    <div className="dk-words">
      <Swap k={gate ? 'table' : 'line'} kind="words" layerClass="dk-wl dk-wl-c">
        {gate ? (
          <div className="dk-rawwrap">
            <StatRow stat={b.stat} />
            <RawCard markOn={b.markOn} table={b.table} />
          </div>
        ) : (
          <p className="dk-a">{b.before}</p>
        )}
      </Swap>
    </div>
  );
}

function Prices({ table }: { table: PriceTable }) {
  return (
    <table className="dk-tb dk-mk">
      <thead>
        <tr>
          <th>Market</th>
          {table.cols.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((r) => (
          <tr key={r.market}>
            <td className="dk-mk-m">{r.market}</td>
            {r.cells.map((c, i) => (
              <td key={i}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Page({ b }: { b: Extract<Body, { t: 'page' }> }) {
  const { has } = useDeck();
  return (
    <div className="dk-page">
      <div className="dk-page-h">
        <span className="dk-page-t">{b.title}</span>
        <span className="dk-dl">{b.tag}</span>
      </div>
      <div className="dk-page-rows">
        {b.rows.map((r: PageRow) => (
          <R key={r.id} id={r.id} className="dk-pr">
            <span className="dk-pr-i">{r.icon === 'where' ? <MapPin size={16} strokeWidth={1.75} /> : <TrendingUp size={16} strokeWidth={1.75} />}</span>
            <span className="dk-pr-v">{r.title}</span>
          </R>
        ))}
      </div>
      <R id={b.tableOn} className="dk-page-tb">
        <Prices table={b.table} />
      </R>
    </div>
  );
}

function Roadmap({ rows }: { rows: RoadRow[] }) {
  const { has } = useDeck();
  const now = useMemo(() => rows.reduce<string | null>((a, r) => (has(r.id) ? r.id : a), null), [rows, has]);
  return (
    <div className="dk-road">
      {rows.map((r, i) => {
        const on = has(r.id);
        return (
          <div key={r.id} className={cx('dk-rr', on && 'on', now === r.id && 'now')}>
            <span className="dk-rn">{i + 1}</span>
            <R as="span" id={r.id} className="dk-rc">
              <span className="dk-rt">{r.title}</span>
              <span className="dk-rd">{r.desc}</span>
            </R>
          </div>
        );
      })}
    </div>
  );
}

function Ask({ text, face }: { text: string; face: string }) {
  return (
    <div className="dk-ask">
      <span className="zj-av">
        <img src={face} alt="" draggable={false} />
      </span>
      <p className={cx('dk-bub', hasEm(text) && 'dk-two')}>
        <Em text={text} />
      </p>
    </div>
  );
}

function Count({ land, n }: { land: string; n: number }) {
  return (
    <div className="dk-count">
      {Array.from({ length: n }, (_, i) => (
        <R as="span" key={i} id={land} st={70} className="dk-rn dk-rn-big">
          {i + 1}
        </R>
      ))}
    </div>
  );
}

/* the proof on the fact checker's desk. Print drawn in hairlines, three claims in it. */
const PW = 216;
const PH = 276;
const COLS = [
  { x: 16, w: 86 },
  { x: 114, w: 86 },
];
const LINE_Y0 = 64.5;
const PITCH = 6;
const LINES = 34;
const CLAIMS = [
  { col: 0, from: 4, to: 6 },
  { col: 1, from: 12, to: 14 },
  { col: 0, from: 23, to: 25 },
];
const SHORT = [7, 15, 21, 30];
const lineW = (col: number, i: number, w: number) => {
  if (SHORT.includes(i + col * 3)) return w * (0.42 + ((i * 7 + col * 3) % 5) * 0.08);
  return w - ((i * 5 + col) % 3 === 0 ? 3 : 0);
};

function Proof({ markOn, checkOn }: { markOn: string; checkOn: string }) {
  const { has } = useDeck();
  const marked = has(markOn);
  const checked = has(checkOn);
  return (
    <div className="dk-proof" style={{ width: PW, height: PH }}>
      <span className="dk-sheet dk-sb2" />
      <span className="dk-sheet dk-sb1" />
      <span className="dk-sheet dk-sf">
        <svg width={PW} height={PH} viewBox={`0 0 ${PW} ${PH}`} aria-hidden>
          <rect x={(PW - 64) / 2} y={17} width={64} height={3} rx={1.5} className="dk-p-ink" />
          <line x1={16} x2={PW - 16} y1={28.5} y2={28.5} className="dk-p-rule" />
          <rect x={16} y={38} width={152} height={3} rx={1.5} className="dk-p-head" />
          <rect x={16} y={46} width={108} height={3} rx={1.5} className="dk-p-head" />
          {COLS.map((c, ci) =>
            Array.from({ length: LINES }, (_, i) => {
              const claim = CLAIMS.findIndex((k) => k.col === ci && i >= k.from && i <= k.to);
              const y = LINE_Y0 + i * PITCH;
              return (
                <line
                  key={`${ci}-${i}`}
                  x1={c.x}
                  x2={c.x + lineW(ci, i, c.w)}
                  y1={y}
                  y2={y}
                  className={cx('dk-p-line', claim >= 0 && 'claim', claim >= 0 && marked && 'on')}
                  style={claim >= 0 ? { transitionDelay: `${claim * 90}ms` } : undefined}
                />
              );
            })
          )}
        </svg>
        {CLAIMS.map((k, i) => (
          <R
            as="span"
            key={i}
            id={markOn}
            st={90}
            className={cx('dk-chk', checked && 'ck')}
            style={{ left: COLS[k.col].x + COLS[k.col].w - 9, top: LINE_Y0 + ((k.from + k.to) / 2) * PITCH - 9, transitionDelay: `${i * 200}ms` }}
          >
            <span data-on={checkOn} data-st={200} className="dk-chk-i">
              <Check size={11} strokeWidth={2.25} />
            </span>
          </R>
        ))}
      </span>
    </div>
  );
}

function Claims({ rows }: { rows: Extract<Body, { t: 'claims' }>['rows'] }) {
  return (
    <div className="dk-road dk-claims">
      {rows.map((r) => (
        <div key={r.id} className="dk-cl">
          <span className="dk-cl-n">{r.name}</span>
          <span className="dk-src">
            <Link2 size={13} strokeWidth={1.75} />
            Source
          </span>
          <span className="dk-cl-s">
            <R as="span" id={r.id} className={cx('zj-status', r.tone === 'ok' && 'zj-ok', r.tone === 'no' && 'dk-st-no')}>
              {r.tone === 'ok' && <Check size={12} strokeWidth={2} />}
              {r.label}
            </R>
          </span>
        </div>
      ))}
    </div>
  );
}

export function BodyView({ body }: { body: Body }) {
  switch (body.t) {
    case 'title':
      return <Title b={body} />;
    case 'volume':
      return <VolumeScene steps={body.steps} prices={body.prices} walkOn={body.walkOn} />;
    case 'markets':
      return <Markets turnOn={body.turnOn} cells={body.cells} />;
    case 'compare':
      return <Compare cards={body.cards} />;
    case 'raw':
      return <Raw b={body} />;
    case 'page':
      return <Page b={body} />;
    case 'roadmap':
      return <Roadmap rows={body.rows} />;
    case 'ask':
      return <Ask text={body.text} face={body.face} />;
    case 'count':
      return <Count land={body.land} n={body.n} />;
    case 'proof':
      return <Proof markOn={body.markOn} checkOn={body.checkOn} />;
    case 'claims':
      return <Claims rows={body.rows} />;
    default:
      return null;
  }
}
