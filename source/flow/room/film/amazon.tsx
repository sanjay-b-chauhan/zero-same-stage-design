/* Aaron's kickoff for Amazon, drawn on his words (words.ts). Stages, files and tools come from flow/data/amazon.ts and the
   real logos in static/logos; the claims stay bars, because the film never makes up an announcement. */
import {
  CircleCheck,
  CircleDashed,
  CircleHelp,
  CircleX,
  FileCheck,
  FileCode,
  FileKey,
  Globe,
  Lock,
  Link as LinkIcon,
  Newspaper,
  SearchCheck,
} from 'lucide-react';
import { AMAZON } from '../../data/amazon';
import { Draw, Ico, In, Scene, useFilm } from './core';
import type { Chapter } from './Film';
import { Bar, Face, Logo, Node, Page, Road, Who, type Step } from './parts';

const META = AMAZON.meta;
const LOGO = META.logo;
const AARON = META.manager.face;
const ME = 'static/faces/learner.jpg';
const REPO = 'zero-student / amazon-fact-checker';

const STEPS: Step[] = META.stages.map((s) => ({
  name: s.short ?? s.title,
  type: s.deliverable?.type ?? '',
  chip: s.deliverable?.label ?? '',
  min: s.minutes,
}));

/* ---------------- Intro ---------------- */
function Intro() {
  const { on } = useFilm();
  return (
    <>
      <In k="_0" a="settle" x={on('aaron') ? 640 : 960} y={390}>
        <Node l="Amazon">
          <Logo src={LOGO} s={190} />
        </Node>
      </In>
      <In k="aaron" a="left" al="l" x={1010} y={280} d={0.14} dim="your">
        <Who src={AARON} s={140} n={META.manager.full} r="Manager" />
      </In>
      <Draw k="manager" p={[[1080, 366], [1080, 428]]} w={3.5} />
      <In k="your" a="left" al="l" x={1010} y={514}>
        <Who src={ME} s={140} n="You" r="Engineer" />
      </In>
    </>
  );
}

/* ---------------- Problem ---------------- */
const CLAIM_ROWS = [0, 2, 4];
function Announcement({ claims, hard }: { claims: boolean; hard: boolean }) {
  const ws = [330, 250, 300, 340, 260, 310];
  return (
    <Page w={460} h={560} c="kf-ann">
      <Logo src={LOGO} s={72} c="kf-ann-logo" />
      {ws.map((w, i) => {
        const claim = CLAIM_ROWS.includes(i);
        return (
          <div key={i} className="kf-li">
            <Bar w={w} c={claim && claims ? 'ink' : undefined} />
            {claim && hard && (
              <In k="hard" a="pop" d={CLAIM_ROWS.indexOf(i) * 0.1}>
                <Ico I={CircleHelp} s={40} />
              </In>
            )}
          </div>
        );
      })}
    </Page>
  );
}

function Problem() {
  const { on } = useFilm();
  return (
    <>
      <Scene k="_0" till="fact">
        <In k="_0" a="settle" x={on('ann') ? 520 : 960} y={400} dim="claims">
          <Logo src={LOGO} s={on('ann') ? 150 : 190} />
        </In>
        <In k="all" x={1140} y={390} d={0.1} s={{ rotate: '6deg' }}>
          <Page w={460} h={560} />
        </In>
        <In k="all" x={1110} y={396} s={{ rotate: '3deg' }}>
          <Page w={460} h={560} />
        </In>
        <In k="ann" x={1060} y={400}>
          <Announcement claims={on('claims')} hard={on('hard')} />
        </In>
      </Scene>
      <Scene k="fact">
        <In k="fact" a="pop" x={680} y={320}>
          <Node l="Fact checker">
            <Ico I={SearchCheck} s={160} />
          </Node>
        </In>
        <In k="newspaper" a="pop" x={1260} y={320}>
          <Node l="Newspaper">
            <Ico I={Newspaper} s={160} />
          </Node>
        </In>
        <In k="nothing" a="pop" x={1370} y={210} till="checked">
          <Ico I={Lock} s={72} />
        </In>
        {[0, 1, 2].map((i) => (
          <In key={i} k="every" x={560 + i * 400} y={640} d={i * 0.08} c="kf-claim">
            <span className="kf-swap">
              <In k="every" till="checked" a="none">
                <Ico I={CircleDashed} s={56} />
              </In>
              <In k="checked" a="pop" d={i * 0.14} c="kf-ok">
                <Ico I={CircleCheck} s={56} />
              </In>
            </span>
            <Bar w={220} c={on('checked') ? 'ink' : undefined} />
          </In>
        ))}
      </Scene>
    </>
  );
}

/* ---------------- Outcome: the app ---------------- */
const VERDICT = [
  { k: 'verified', I: CircleCheck, l: 'Verified', c: 'kf-ok' },
  { k: 'unverified', I: CircleDashed, l: 'Unverified', c: '' },
  { k: 'unsupported', I: CircleX, l: 'Unsupported', c: '' },
];

function Outcome() {
  const { on } = useFilm();
  const chipsFaint = on('fact') && !on('source');
  return (
    <>
      <In k="_0" a="settle" x={960} y={410} wake="app">
        <div className="kf-win" style={{ width: 1260, height: 600 }}>
          <div className="kf-win-top">
            <i />
            <i />
            <i />
            {on('fact') && (
              <In k="fact" c="kf-win-t">
                Fact checker
              </In>
            )}
          </div>
          <In k="reads" x={190} y={330} a="left">
            <Page w={250} h={340} c="kf-mini">
              <Logo src={LOGO} s={52} c="kf-ann-logo" />
              <Bar w={170} />
              <Bar w={130} c={on('checks') ? 'ink' : undefined} />
              <Bar w={160} />
              <Bar w={120} c={on('checks') ? 'ink' : undefined} />
              <Bar w={150} c={on('checks') ? 'ink' : undefined} />
            </Page>
          </In>
          {VERDICT.map((v, i) => (
            <In key={v.k} k="claim" x={420} y={200 + i * 130} al="l" d={i * 0.08} c="kf-vrow">
              <span className="kf-swap">
                <In k="claim" till={v.k} a="none">
                  <Ico I={CircleDashed} s={56} c="var(--b-t3)" />
                </In>
                <In k={v.k} a="pop" c={v.c}>
                  <Ico I={v.I} s={56} />
                </In>
              </span>
              <span className="kf-vbody">
                <Bar w={300} />
                {on(v.k) && (
                  <In k={v.k} c="kf-vl">
                    {v.l}
                  </In>
                )}
              </span>
              <In k="sources" a="pop" d={i * 0.08} c="kf-src" faint={chipsFaint}>
                <Ico I={LinkIcon} s={36} />
                <Bar w={110} />
              </In>
            </In>
          ))}
        </div>
      </In>
      <Draw k="checks" p={[[664, 440], [736, 440]]} w={3.5} head={14} />
    </>
  );
}

/* ---------------- Process ---------------- */
const MIN_K = ['m1', 'm2', 'm3', 'm4'];
const STEP_K = ['first', 'second', 'third', 'last'];

function Process() {
  const { on } = useFilm();
  let cur = -1;
  STEP_K.forEach((k, i) => {
    if (on(k)) cur = i;
  });
  const top = on('first');
  return (
    <>
      <In k="_0" a="settle" x={960} y={top ? 110 : 360} s={{ scale: top ? 0.8 : 1 }}>
        <Road steps={STEPS} gap={420} popK="_0" labK="project" extK="real" extTill="first" cur={cur} minK={cur >= 0 ? MIN_K[cur] : undefined} />
      </In>

      <Scene k="first" till="second">
        <In k="env" x={820} y={500}>
          <div className="kf-win kf-repo b-light" style={{ width: 820 }}>
            <div className="kf-win-top">
              <img src="static/logos/github.svg" alt="" className="kf-gh" />
              <span className="kf-win-t">{REPO}</span>
            </div>
            <div className="kf-files">
              <In k="keys" c="kf-file-r">
                <img src="static/logos/f-env.svg" alt="" />
                <span>.env.example</span>
              </In>
              <In k="private" c="kf-file-r">
                <img src="static/logos/f-git.svg" alt="" />
                <span>.gitignore</span>
              </In>
              <In k="frontend" c="kf-file-r">
                <Ico I={FileCode} s={40} />
                <span>index.html</span>
              </In>
            </div>
          </div>
        </In>
        <In k="keys" a="pop" x={1480} y={500}>
          <Node sub=".env">
            <span className="kf-lockw">
              <Ico I={FileKey} s={140} />
              {on('private') && (
                <In k="private" a="pop" c="kf-lock">
                  <Ico I={Lock} s={60} />
                </In>
              )}
            </span>
          </Node>
        </In>
      </Scene>

      <Scene k="second" till="third">
        <In k="connect" a="pop" x={620} y={520}>
          <Node sub="index.html">
            <Ico I={FileCode} s={140} />
          </Node>
        </In>
        <Draw k="connect" p={[[740, 470], [1150, 470]]} w={3.5} head={18} d={0.2} dur={0.9} />
        <In k="model" a="pop" x={1300} y={520}>
          <Node l="OpenRouter">
            <Logo src="static/logos/tool-openrouter.png" s={150} />
          </Node>
        </In>
      </Scene>

      <Scene k="third" till="last">
        <In k="trace" a="pop" x={520} y={520}>
          <Node l="LangSmith">
            <Logo src="static/logos/tool-langsmith.png" s={150} />
          </Node>
        </In>
        {[
          [0, 360],
          [40, 200],
          [120, 150],
          [190, 130],
        ].map(([o, w], i) => (
          <In key={i} k="trace" al="l" x={800 + o} y={400 + i * 56} d={0.15 + i * 0.1} a="left">
            <i className="kf-span" style={{ width: w }} />
          </In>
        ))}
        <In k="test" a="pop" x={1500} y={520}>
          <Node l="Test report" sub=".md">
            <Ico I={FileCheck} s={150} />
          </Node>
        </In>
      </Scene>

      <Scene k="last">
        <In k="ship" a="pop" x={960} y={500}>
          <Node l="Live URL">
            <Ico I={Globe} s={190} />
          </Node>
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
      <In k="_0" a="settle" x={together ? 960 : 740} y={360}>
        <Page w={300} h={380} c="kf-who-p">
          <Face src={AARON} s={96} />
          <Bar w={190} />
          <Bar w={150} />
          <Bar w={170} />
        </Page>
      </In>
      <In k="_0" a="settle" x={together ? 960 : 1180} y={360}>
        <Page w={300} h={380} c={'kf-who-p kf-me' + (together ? ' kf-ghost' : '')}>
          <Face src={ME} s={96} />
          <Bar w={190} />
          <Bar w={150} />
          <Bar w={170} />
        </Page>
      </In>
      {[0, 1, 2].map((i) => (
        <In key={i} k="ready" a="pop" x={860 + i * 100} y={680} d={i * 0.09}>
          <Ico I={CircleHelp} s={72} />
        </In>
      ))}
    </>
  );
}

export const AMAZON_FILM: Chapter[] = [
  { spec: 'aaron Aaron|your your|manager manager|follow follow|minute minute', C: Intro },
  {
    spec: 'problem problem|amazon Amazon|ann announcements|all all|claims claims|hard hard|fact fact|newspaper newspaper|nothing Nothing|every every|checked checked',
    C: Problem,
  },
  {
    spec: 'app app|reads reads|ann announcement|checks checks|claim claim|sources sources|fact fact|checker checker|verified verified|unverified unverified|unsupported unsupported|source source|next next',
    C: Outcome,
  },
  {
    spec:
      'f1 first|f2 first|project project|real real|first First|env environment|github GitHub|repo repo|api API|keys keys|private private|frontend frontend|m1 25|second Second|connect connect|model model|m2 25|third Third|trace trace|test test|m3 20|last last|ship ship|m4 15|sound Sound',
    C: Process,
  },
  { spec: 'same same|ready ready', C: Outro },
];
