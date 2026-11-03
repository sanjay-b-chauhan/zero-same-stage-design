/* Eryn's kickoff for Spotify, drawn on her words. Every cue names the word it lands on, read from her real takes (words.ts).
   Rows, prices, file names and stages come from flow/data. Nothing here says what she says; it shows what she means. */
import { CircleHelp, DoorOpen, MapPin, MessageCircle, MessageCircleQuestion, Presentation, Tag, TrendingUp, User, Users } from 'lucide-react';
import { RAW } from '../../data/raw';
import { SPOTIFY } from '../../data/spotify';
import { Draw, Ico, In, Scene, useFilm } from './core';
import type { Chapter } from './Film';
import { Bar, Ext, Face, Logo, Node, Page, Road, Sheet, Speaker, Who, type SheetRow, type Step } from './parts';

const META = SPOTIFY.meta;
const LOGO = META.logo;
const ERYN = META.manager.face;
const ME = 'static/faces/learner.jpg';
const MARKETS = Object.keys(RAW.market);
const COUNTRY: Record<string, string> = { US: 'United States', MX: 'Mexico', BR: 'Brazil', UK: 'United Kingdom', DE: 'Germany', IN: 'India' };
const money = (sym: string, v: number) => `${sym}${Number.isInteger(v) ? v : v.toFixed(2)}`;
const PRICE = MARKETS.map((m) => money(RAW.market[m].sym, RAW.market[m].p[0]));

const STEPS: Step[] = META.stages.map((s) => ({ name: s.short ?? s.title, type: s.deliverable?.type ?? '', chip: s.deliverable?.type ?? '', min: s.minutes }));

/* the real export: these seven rows hold exactly ten bad cells in these six columns */
const RAW_COLS = ['customer_name', 'plan', 'monthly_price', 'currency', 'billing_city', 'signup_date'];
const RAW_MARKS: Record<number, string[]> = {
  2: ['monthly_price'],
  3: ['plan'],
  4: ['monthly_price', 'signup_date'],
  7: ['customer_name'],
  12: ['currency', 'signup_date'],
  17: ['monthly_price'],
  19: ['customer_name', 'monthly_price'],
};
const rawRows = (cols: string[], nums: number[]): SheetRow[] =>
  nums.map((n) => ({
    n,
    cells: cols.map((c) => ({ text: RAW.rows[n - 2][RAW.cols.indexOf(c)], bad: RAW_MARKS[n].includes(c) })),
  }));

/* ---------------- Intro ---------------- */
function Intro() {
  const { on } = useFilm();
  return (
    <>
      <Scene k="_0" till="big">
        <In k="_0" a="settle" x={on('erin') ? 640 : 960} y={390}>
          <Node l="Spotify">
            <Logo src={LOGO} s={190} />
          </Node>
        </In>
        <In k="erin" a="left" al="l" x={1010} y={280} d={0.14} dim="your">
          <Who src={ERYN} s={140} n={META.manager.full} r="Manager" />
        </In>
        <Draw k="manager" p={[[1080, 366], [1080, 428]]} w={3.5} />
        <In k="your" a="left" al="l" x={1010} y={514}>
          <Who src={ME} s={140} n="You" r="Pricing Analyst" />
        </In>
      </Scene>
      <Scene k="big" till="follow">
        <In k="spotify" a="pop" x={700} y={380} dim="nobody">
          <Logo src={LOGO} s={150} />
        </In>
        <In k="big" a="pop" x={on('spotify') ? 1000 : 960} y={380} dim="nobody">
          <Ico I={Tag} s={210} />
        </In>
        <In k="nobody" a="pop" x={1320} y={380}>
          <Ico I={CircleHelp} s={150} />
        </In>
      </Scene>
      <Scene k="follow">
        <In k="follow" x={960} y={360} a="none">
          <Road
            big
            gap={400}
            popK="follow"
            fill={on('walk') ? 1 : 0}
            steps={['Problem', 'Outcome', 'Process'].map((name) => ({ name, type: '', chip: '', min: 0 }))}
          />
        </In>
      </Scene>
    </>
  );
}

/* ---------------- Problem ---------------- */
const crowd = (n: number, x0: number, step: number, y: number, s: number, k: string, walk: number[], walkK: string, d0 = 0) =>
  Array.from({ length: n }, (_, i) => (
    <In key={i} k={k} x={x0 + i * step} y={y} d={d0 + i * 0.06} till={walk.includes(i) ? walkK : undefined} out="right">
      <Ico I={User} s={s} />
    </In>
  ));

function Pair({ x, k, walkK, dim }: { x: number; k: string; walkK?: string; dim?: string }) {
  return (
    <>
      <In k={k} a="pop" x={x - 66} y={300} dim={dim}>
        <Speaker s={100} lv={2} />
      </In>
      <In k={k} a="pop" x={x + 66} y={300} d={0.06} dim={dim}>
        <Speaker s={100} lv={2} />
      </In>
      {Array.from({ length: 4 }, (_, i) => (
        <In key={i} k={k} x={x - 120 + i * 80} y={500} d={0.14 + i * 0.05} dim={dim} till={walkK && i > 0 ? walkK : undefined} out="right">
          <Ico I={User} s={78} />
        </In>
      ))}
    </>
  );
}

function Problem() {
  const { on } = useFilm();
  const whereFaint = (on('much') && !(on('which') && !on('far2'))) || on('nobody2');
  const muchFaint = (on('which') && !on('far2')) || on('nobody2');
  return (
    <>
      <Scene k="_0" till="spotify">
        <In k="_0" a="settle" x={580} y={260}>
          <Ico I={Tag} s={170} />
        </In>
        <In k="price" x={580} y={410}>
          <b className="kf-l">Price</b>
        </In>
        <Draw k="like" p={[[700, 260], [940, 260]]} w={3.5} dash="2 16" />
        <In k="volume" a="pop" x={1080} y={260}>
          <Speaker s={170} lv={on('far') ? 3 : on('up') ? 1 : 0} />
        </In>
        <In k="volume" x={1080} y={410} d={0.1}>
          <b className="kf-l">Volume</b>
        </In>
        {crowd(5, 740, 110, 600, 92, 'turn', [3, 4], 'walk')}
        <In k="walk" a="pop" x={1420} y={600}>
          <Ico I={DoorOpen} s={120} />
        </In>
      </Scene>

      <Scene k="spotify" till="a1">
        <In k="spotify" a="pop" x={960} y={150}>
          <Logo src={LOGO} s={120} />
        </In>
        {MARKETS.map((m, i) => (
          <In key={'s' + m} k="turned" a="pop" x={960 + (i - 2.5) * 250} y={350} d={i * 0.07}>
            <Speaker s={96} lv={2} />
          </In>
        ))}
        {MARKETS.map((m, i) => (
          <In key={m} k="six" x={960 + (i - 2.5) * 250} y={500} d={i * 0.07}>
            <Node l={m} sub={PRICE[i]} gap={0} />
          </In>
        ))}
      </Scene>

      <Scene k="a1" till="now">
        <Pair x={620} k="a1" dim="a2" />
        <Pair x={1300} k="a2" walkK="lost" />
      </Scene>

      <Scene k="now" till="data">
        <In k="leadership" a="pop" x={960} y={200}>
          <Node l="Leadership">
            <Ico I={Users} s={140} />
          </Node>
        </In>
        <Draw k="where" p={[[880, 330], [700, 450]]} w={3.5} />
        <In k="where" a="pop" x={640} y={560} faint={whereFaint}>
          <Node l="Where next">
            <Ico I={MapPin} s={110} />
          </Node>
        </In>
        <Draw k="much" p={[[1040, 330], [1220, 450]]} w={3.5} />
        <In k="much" a="pop" x={1280} y={560} faint={muchFaint}>
          <Node l="How much">
            <Ico I={TrendingUp} s={110} />
          </Node>
        </In>
        <In k="nobody2" a="pop" x={960} y={540}>
          <Ico I={CircleHelp} s={110} />
        </In>
      </Scene>

      <Scene k="data">
        <In k="data" x={860} y={420} dim="dark">
          <Sheet name={RAW.name} cols={RAW_COLS} widths={[250, 230, 170, 130, 190, 170]} rows={rawRows(RAW_COLS, [2, 3, 4, 7, 12, 17, 19])} rowK="pulled" badK="ten" />
        </In>
        <In k="ten" a="pop" x={1660} y={400} dim="dark">
          <b className="kf-n kf-bad">10</b>
        </In>
      </Scene>
    </>
  );
}

/* ---------------- Outcome ---------------- */
function Outcome() {
  const { on } = useFilm();
  const px = on('leadership') ? 620 : 960;
  return (
    <>
      <In k="list" till="just" x={px - 160} y={430} s={{ rotate: '-5deg' }}>
        <Page w={520} h={520} />
      </In>
      <In k="list" till="just" x={px + 160} y={430} d={0.08} s={{ rotate: '5deg' }}>
        <Page w={520} h={520} />
      </In>
      <In k="_0" a="settle" x={px} y={410}>
        <Page w={580} h={560} c="kf-rec">
          <div className="kf-pt">
            {on('recommendation') ? (
              <In k="recommendation" c="kf-ptw">
                <b className="kf-pl">Recommendation</b>
                <Ext t=".pdf" s={34} />
              </In>
            ) : (
              <Bar w={300} />
            )}
          </div>
          {on('two') ? (
            [0, 1].map((r) => (
            <div key={r} className="kf-slot">
              <In k="two" d={r * 0.08} c="kf-slotb" a="pop">
                {r === 0 ? (
                  <In k="where" c="kf-slotf" a="rise">
                    <Ico I={MapPin} s={64} />
                    <b className="kf-pl">Where next</b>
                  </In>
                ) : (
                  <In k="how" c="kf-slotf" a="rise">
                    <Ico I={TrendingUp} s={64} />
                    <b className="kf-pl">How much</b>
                  </In>
                )}
              </In>
            </div>
            ))
          ) : (
            <>
              <Bar w={460} />
              <Bar w={400} />
              <Bar w={430} />
              <Bar w={380} />
            </>
          )}
        </Page>
      </In>
      <In k="leadership" a="pop" x={1340} y={330} till="numbers">
        <Node l="Leadership">
          <Ico I={Users} s={140} />
        </Node>
      </In>
      <In k="asks" a="pop" x={1520} y={190} till="numbers">
        <Ico I={MessageCircleQuestion} s={100} />
      </In>
      <In k="numbers" x={1360} y={410}>
        <div className="kf-tbl">
          <div className="kf-tr kf-th">
            <span>Market</span>
            <span>Now</span>
            <span>New</span>
          </div>
          {MARKETS.map((m, i) => (
            <In key={m} k="market" d={i * 0.06} c="kf-tr">
              <b>{m}</b>
              <span>{PRICE[i]}</span>
              <span>
                <Bar w={110} />
              </span>
            </In>
          ))}
        </div>
      </In>
    </>
  );
}

/* ---------------- Process ---------------- */
const MIN_K = ['m1', 'm2', 'm3', 'm4', 'm5'];
const STEP_K = ['first', 'second', 'third', 'fourth', 'last'];
const MODEL_COLS = ['market', 'customers', 'monthly_revenue_usd', 'revenue_per_user_usd'];
const modelRows: SheetRow[] = MARKETS.map((m, i) => ({
  n: i + 2,
  cells: [{ text: COUNTRY[m] ?? m }, { text: '', ph: true }, { text: '', ph: true }, { text: '', ph: true }],
}));

function Process() {
  const { on } = useFilm();
  let cur = -1;
  STEP_K.forEach((k, i) => {
    if (on(k)) cur = i;
  });
  if (on('im')) cur = -1;
  const top = on('first') && !on('im');
  return (
    <>
      <In k="_0" a="settle" x={960} y={top ? 110 : on('im') ? 300 : 380} s={{ scale: top ? 0.8 : 1 }}>
        <Road steps={STEPS} gap={340} popK="_0" labK="five" extK="hand" extTill="first" cur={cur} minK={cur >= 0 ? MIN_K[cur] : undefined} fill={on('whole') ? 1 : 0} />
      </In>

      <Scene k="first" till="second">
        <In k="clean" x={490} y={500}>
          <Sheet
            name={RAW.name}
            cols={['customer_name', 'plan', 'monthly_price']}
            widths={[220, 220, 200]}
            rows={rawRows(['customer_name', 'plan', 'monthly_price'], [2, 3, 4, 7])}
            rowK="clean"
            badK="wrong"
            rowH={48}
          />
        </In>
        <Draw k="clawed" p={[[872, 500], [962, 500]]} w={3.5} head={16} />
        <In k="clawed" a="pop" x={1080} y={540}>
          <Node l="Claude">
            <Logo src="static/logos/logo-claude.svg" s={140} />
          </Node>
        </In>
        <Draw k="fix" p={[[1200, 500], [1300, 500]]} w={3.5} head={16} />
        <In k="clean2" a="pop" x={1480} y={540}>
          <Node sub="spotify_pricing_clean.csv">
            <img className="kf-file" src="static/logos/f-csv.svg" alt="" />
          </Node>
        </In>
      </Scene>

      <Scene k="second" till="third">
        <In k="build" x={880} y={500}>
          <Sheet name="revenue_model" cols={MODEL_COLS} widths={[250, 190, 290, 320]} rows={modelRows} rowK="market" rowH={48} />
        </In>
        <In k="knob" a="pop" x={1580} y={500}>
          <Speaker s={120} lv={on('go') ? 3 : 1} />
        </In>
      </Scene>

      <Scene k="third" till="fourth">
        <In k="rec" x={960} y={510}>
          <Page w={460} h={460} c="kf-sm">
            <div className="kf-ptw">
              <b className="kf-pl">Recommendation</b>
              <Ext t=".pdf" s={30} />
            </div>
            <div className="kf-li">
              <Ico I={MapPin} s={48} />
              <Bar w={240} />
            </div>
            <div className="kf-li">
              <Ico I={TrendingUp} s={48} />
              <Bar w={200} />
            </div>
            <Bar w={340} />
            <Bar w={300} />
          </Page>
        </In>
      </Scene>

      <Scene k="fourth" till="last">
        <In k="memo" x={960} y={510}>
          <Page w={460} h={460} c="kf-sm">
            <div className="kf-ptw">
              <b className="kf-pl">Pricing memo</b>
              <Ext t=".pdf" s={30} />
            </div>
            <Bar w={370} />
            <Bar w={340} />
            <Bar w={360} />
            <Bar w={250} />
            <Bar w={330} />
          </Page>
        </In>
      </Scene>

      <Scene k="last" till="im">
        <In k="present" a="pop" x={960} y={500}>
          <Node l={META.stages[4]?.deliverable?.label ?? 'Slide deck'} sub=".pptx">
            <Ico I={Presentation} s={190} />
          </Node>
        </In>
      </Scene>

      <Scene k="im">
        <In k="stuck" a="pop" x={820} y={600}>
          <Ico I={CircleHelp} s={110} />
        </In>
        <Draw k="ask" p={[[900, 600], [1240, 600]]} w={3.5} dash="2 16" head={16} />
        <In k="ask" a="pop" x={1340} y={600} d={0.5}>
          <Face src={ERYN} s={120} />
        </In>
        <In k="ask" a="pop" x={1420} y={530} d={0.62}>
          <Ico I={MessageCircle} s={64} />
        </In>
      </Scene>
    </>
  );
}

/* ---------------- Outro ---------------- */
function Outro() {
  const { on } = useFilm();
  const together = on('same');
  return (
    <>
      <Scene k="_0" till="alright">
        <In k="_0" a="settle" x={960} y={300} wake="lot" dim="just">
          <Road steps={STEPS} gap={340} popK="_0" />
        </In>
        <In k="which" a="pop" x={700} y={600}>
          <Node l="Where next">
            <Ico I={MapPin} s={96} />
          </Node>
        </In>
        <In k="far" a="pop" x={1220} y={600}>
          <Node l="How much">
            <Ico I={TrendingUp} s={96} />
          </Node>
        </In>
      </Scene>
      <Scene k="alright">
        <In k="alright" x={together ? 960 : 740} y={360}>
          <Page w={300} h={380} c="kf-who-p">
            <Face src={ERYN} s={96} />
            <Bar w={190} />
            <Bar w={150} />
            <Bar w={170} />
          </Page>
        </In>
        <In k="alright" x={together ? 960 : 1180} y={360} d={0.08}>
          <Page w={300} h={380} c={'kf-who-p kf-me' + (together ? ' kf-ghost' : '')}>
            <Face src={ME} s={96} />
            <Bar w={190} />
            <Bar w={150} />
            <Bar w={170} />
          </Page>
        </In>
        {[0, 1, 2].map((i) => (
          <In key={i} k="questions" a="pop" x={860 + i * 100} y={680} d={i * 0.09}>
            <Ico I={CircleHelp} s={72} />
          </In>
        ))}
      </Scene>
    </>
  );
}

export const SPOTIFY_FILM: Chapter[] = [
  { spec: 'erin Erin|your your|manager manager|big big|spotify Spotify|nobody nobody|follow follow|walk walk', C: Intro },
  {
    spec:
      'price price|like like|volume volume|turn turn|up up|nobody nobody|far far|walk walk|room room|spotify Spotify|raised raised|six six|turned turned|knobs knobs|a1 A|didnt didnt|a2 A|lost lost|now Now|leadership leadership|where where|much much|which which|knob knob|far2 far|and2 And|nobody2 nobody|data data|mess mess|pulled pulled|export export|ten 10|wrong wrong|dark dark',
    C: Problem,
  },
  {
    spec: 'one one|recommendation recommendation|list list|maybe maybe|just Just|two two|where where|how how|leadership leadership|asks asks|why why|knob knob|far far|numbers numbers|market Market',
    C: Outcome,
  },
  {
    spec:
      'five five|stages stages|hand hand|first First|clean clean|m1 15|wrong wrong|clawed clawed|fix fix|clean2 clean|csv CSV|second Second|build build|revenue revenue|market market|big big|m2 25|knob knob|go go|third Third|rec recommendation|m3 15|call call|fourth Fourth|memo memo|m4 15|last last|present present|m5 12|im Im|whole whole|stuck stuck|ask ask|plan plan',
    C: Process,
  },
  { spec: 'plans plans|lot lot|just just|which which|far far|alright Alright|same same|questions questions|ready ready', C: Outro },
];
