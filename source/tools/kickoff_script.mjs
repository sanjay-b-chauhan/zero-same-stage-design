/* The kickoff meetings as data: who says what, what lands on which word, what gets graded, and the deck panels.
   WGLL manager voice, one analogy ridden start to finish. Facts only from the founder docs and b1.
   tools/make_takes.mjs turns this into data/run_<project>.json and static/kickoff/<project>/.
   Line shape: { t: spoken text, ctx?: context point id, cues?: [{ on?: phrase in t (omit for the line start), a: action, id }] } */

const panelsSpotify = (wm) => `
    <!-- ===== INTRO ===== -->
    <div class="panel fill" id="p-b1-1">
      <span class="wordmark">${wm}</span>
      <div class="cover u">
        <div class="big">Where do we raise<br><em>next</em>?</div>
        <div class="sub">Eryn Mitchell, Spotify</div>
      </div>
      <div class="pillnote held" id="pill-cover">A big call to make.</div>
    </div>

    <!-- ===== PROBLEM ===== -->
    <div class="panel" id="p-b2-1">
      <span class="wordmark">${wm}</span>
      <div class="statement u">Think of a price</div>
      <div class="statement held" id="st-knob">like a <em>volume knob</em>.</div>
    </div>

    <div class="panel" id="p-b2-2">
      <span class="wordmark">${wm}</span>
      <div class="statement u">Turn it up a little.<br><em>Nobody notices</em>.</div>
      <div class="statement held" id="st-far" style="font-size:clamp(22px,4.6cqmin,52px)">Too far, and <em class="b">people walk out</em>.</div>
    </div>

    <div class="panel" id="p-b2-3">
      <span class="wordmark">${wm}</span>
      <div class="statement u" style="font-size:clamp(20px,4cqmin,40px)">Premium went up last year in</div>
      <div class="num held" id="num-six">6</div>
      <div class="lbl held" id="lbl-six">markets</div>
    </div>

    <div class="panel" id="p-b2-4">
      <span class="wordmark">${wm}</span>
      <div class="statement u" style="font-size:clamp(26px,5.4cqmin,62px)">Same move. <em>Different result</em>.</div>
      <div class="compare">
        <div class="ccol good" id="cc-held">
          <div class="clab">A couple</div>
          <div class="ctitle">Didn't care</div>
        </div>
        <div class="ccol bad" id="cc-lost">
          <div class="clab">A couple</div>
          <div class="ctitle">Lost a lot of people</div>
        </div>
      </div>
    </div>

    <div class="panel" id="p-b2-5">
      <span class="wordmark">${wm}</span>
      <div class="statement u">Where do we raise <em>next</em>?</div>
      <div class="statement held" id="st-much">And <em>by how much</em>?</div>
    </div>

    <div class="panel" id="p-b2-6">
      <span class="wordmark">${wm}</span>
      <div class="statement u">Nobody can answer that.</div>
      <div class="statement held" id="st-mess">The data's a <em class="b">mess</em>.</div>
    </div>

    <div class="panel above-card" id="p-b2-7">
      <span class="wordmark">${wm}</span>
      <div class="statement u" style="font-size:clamp(20px,4cqmin,40px)">One raw export</div>
      <div class="num bad held" id="num-ten">10</div>
      <div class="lbl held" id="lbl-ten">things wrong with it</div>
    </div>

    <!-- ===== OUTCOME ===== -->
    <div class="panel" id="p-b3-1">
      <span class="wordmark">${wm}</span>
      <div class="statement u">What does <em>good</em> look like?</div>
    </div>

    <div class="panel" id="p-b3-2">
      <span class="wordmark">${wm}</span>
      <div class="deliv u">One clear <em>recommendation</em>.</div>
    </div>

    <div class="panel" id="p-b3-3">
      <span class="wordmark">${wm}</span>
      <div class="statement u" style="font-size:clamp(26px,5.4cqmin,62px)">One call. Two answers.</div>
      <div class="compare">
        <div class="ccol good" id="cc-where">
          <div class="clab">First</div>
          <div class="ctitle">Where we raise next</div>
        </div>
        <div class="ccol good" id="cc-much">
          <div class="clab">Second</div>
          <div class="ctitle">By how much</div>
        </div>
      </div>
    </div>

    <div class="panel above-card" id="p-b3-4">
      <span class="wordmark">${wm}</span>
      <div class="statement u">Why that knob. Why that far.</div>
      <div class="statement held" id="st-numbers" style="font-size:clamp(22px,4.6cqmin,52px)">The numbers, <em>market by market</em>.</div>
    </div>

    <!-- ===== PROCESS ===== -->
    <div class="panel" id="p-b4-1">
      <span class="wordmark">${wm}</span>
      <div class="statement u">Here's the <em>roadmap</em>.</div>
      <div class="statement held" id="st-five" style="font-size:clamp(22px,4.6cqmin,52px)">Five stages. Five things you <em>hand me</em>.</div>
    </div>

    <div class="panel" id="p-b4-2">
      <span class="wordmark">${wm}</span>
      <div class="timeline" style="text-align:left">
        <div class="tl-item" id="tl-1"><div class="tl-dot"></div><div class="tl-body"><div class="tl-title">Clean the dataset</div><div class="tl-desc">15 min, a clean .csv</div></div></div>
        <div class="tl-item" id="tl-2"><div class="tl-dot"></div><div class="tl-body"><div class="tl-title">Build the revenue model</div><div class="tl-desc">25 min, an .xlsx, market by market</div></div></div>
        <div class="tl-item" id="tl-3"><div class="tl-dot"></div><div class="tl-body"><div class="tl-title">Make the recommendation</div><div class="tl-desc">15 min, a .pdf</div></div></div>
        <div class="tl-item" id="tl-4"><div class="tl-dot"></div><div class="tl-body"><div class="tl-title">Write the pricing memo</div><div class="tl-desc">15 min, a .pdf</div></div></div>
        <div class="tl-item" id="tl-5"><div class="tl-dot"></div><div class="tl-body"><div class="tl-title">Present it</div><div class="tl-desc">12 min, a slide deck</div></div></div>
      </div>
    </div>

    <div class="panel above-card" id="p-b4-3">
      <span class="wordmark">${wm}</span>
      <div class="statement u">Stuck? <em>Just ask me</em>.</div>
    </div>

    <!-- ===== OUTRO ===== -->
    <div class="panel" id="p-b5-1">
      <span class="wordmark">${wm}</span>
      <div class="statement u">Which knob.<br><em>How far</em>.</div>
    </div>

    <div class="panel fill" id="p-b5-2">
      <span class="wordmark">${wm}</span>
      <div class="statement u" style="font-size:clamp(40px,min(8cqw,14cqh),110px)">A few <em>quick questions</em>.</div>
    </div>
`;

const panelsAmazon = (wm) => `
    <!-- ===== INTRO ===== -->
    <div class="panel fill" id="p-b1-1">
      <span class="wordmark">${wm}</span>
      <div class="cover u">
        <div class="big">Every claim gets<br><em>checked</em>.</div>
        <div class="sub">Aaron Lee, Amazon</div>
      </div>
    </div>

    <!-- ===== PROBLEM ===== -->
    <div class="panel" id="p-b2-1">
      <span class="wordmark">${wm}</span>
      <div class="statement u">Announcements all the time.</div>
      <div class="statement held" id="st-hard" style="font-size:clamp(22px,4.6cqmin,52px)">A lot of the claims are <em class="b">hard to check</em>.</div>
    </div>

    <div class="panel above-card" id="p-b2-2">
      <span class="wordmark">${wm}</span>
      <div class="statement u">The <em>fact checker</em> at a newspaper.</div>
      <div class="statement held" id="st-runs" style="font-size:clamp(22px,4.6cqmin,52px)">Nothing runs until every claim's been checked.</div>
    </div>

    <!-- ===== OUTCOME ===== -->
    <div class="panel" id="p-b3-1">
      <span class="wordmark">${wm}</span>
      <div class="deliv u">An app that <em>checks every claim</em>, with sources.</div>
    </div>

    <div class="panel above-card" id="p-b3-2">
      <span class="wordmark">${wm}</span>
      <div class="statement u" style="font-size:clamp(26px,5.4cqmin,62px)">Every claim comes back</div>
      <div class="compare">
        <div class="ccol good" id="cc-v"><div class="ctitle" style="font-size:clamp(20px,5.4cqmin,44px)">Verified</div></div>
        <div class="ccol" id="cc-u"><div class="ctitle" style="font-size:clamp(20px,5.4cqmin,44px)">Unverified</div></div>
        <div class="ccol bad" id="cc-s"><div class="ctitle" style="font-size:clamp(20px,5.4cqmin,44px)">Unsupported</div></div>
      </div>
    </div>

    <!-- ===== PROCESS ===== -->
    <div class="panel" id="p-b4-1">
      <span class="wordmark">${wm}</span>
      <div class="statement u">First things first.</div>
      <div class="statement held" id="st-setup" style="font-size:clamp(22px,4.6cqmin,52px)">Something <em>real</em> to build on.</div>
    </div>

    <div class="panel above-card" id="p-b4-2">
      <span class="wordmark">${wm}</span>
      <div class="timeline" style="text-align:left">
        <div class="tl-item" id="tl-1"><div class="tl-dot"></div><div class="tl-body"><div class="tl-title">Set up the environment</div><div class="tl-desc">25 min, a GitHub repo</div></div></div>
        <div class="tl-item" id="tl-2"><div class="tl-dot"></div><div class="tl-body"><div class="tl-title">Connect the model</div><div class="tl-desc">25 min, a working fact check</div></div></div>
        <div class="tl-item" id="tl-3"><div class="tl-dot"></div><div class="tl-body"><div class="tl-title">Trace and test it</div><div class="tl-desc">20 min, a test report</div></div></div>
        <div class="tl-item" id="tl-4"><div class="tl-dot"></div><div class="tl-body"><div class="tl-title">Ship it</div><div class="tl-desc">15 min, a live URL</div></div></div>
      </div>
    </div>

    <!-- ===== OUTRO ===== -->
    <div class="panel fill" id="p-b5-1">
      <span class="wordmark">${wm}</span>
      <div class="statement u" style="font-size:clamp(40px,min(8cqw,14cqh),110px)">Are we on the <em>same page</em>?</div>
    </div>
`;

export const KICKOFFS = {
  spotify: {
    company: 'Spotify',
    title: 'Find Where Spotify Can Raise Prices Next',
    scenarioId: '7c1f0a52-3b1e-4d8a-9c55-1e2f6a7b9d10',
    runId: '9a3e7d14-6f02-4b7e-8a11-5d0c2f4e8b21',
    person: { id: '3f8a1c6e-52d7-4e0b-b6a4-0c9d7e2f1a33', name: 'Eryn Mitchell', role: 'Manager', initials: 'EM' },
    voice: 'af_heart',
    logo: '../../logos/logo-spotify.svg',
    tokens: {
      brand: '#1ED760',
      brand2: '#17B24F',
      brand3: '#0F7A36',
      onHero: '#0B0B0B',
      onHeroDim: 'rgba(11,11,11,.72)',
      pillBg: 'rgba(11,11,11,.14)',
      pillLine: 'rgba(11,11,11,.32)',
      logoFilter: 'none',
      logoFilterFill: 'brightness(0)',
    },
    panels: panelsSpotify,
    points: [
      { id: 'six_markets', term: 'Six markets', bucket: 'Problem', description: 'Spotify raised Premium prices in six markets last year.' },
      { id: 'mixed_reaction', term: 'Mixed reaction', bucket: 'Problem', description: "A couple of markets didn't care, a couple lost a lot of people." },
      { id: 'where_next', term: 'The question', bucket: 'Problem', description: 'Leadership wants to know where to raise next, and by how much.' },
      { id: 'messy_data', term: 'The data', bucket: 'Problem', description: "Nobody can answer that yet, because the data's a mess." },
      { id: 'ten_issues', term: 'Ten issues', bucket: 'Problem', description: 'The raw export has ten things wrong with it.' },
      { id: 'one_recommendation', term: 'One recommendation', bucket: 'Goal', description: 'You come back with one clear recommendation.' },
      { id: 'back_it_up', term: 'Market by market', bucket: 'Goal', description: 'The call is backed by numbers, market by market.' },
      { id: 'clean_dataset', term: 'Clean the dataset', bucket: 'Project Context', description: 'Stage one cleans the raw export into a clean .csv.' },
      { id: 'revenue_model', term: 'Revenue model', bucket: 'Project Context', description: 'Stage two builds the revenue model, market by market.' },
      { id: 'make_recommendation', term: 'Make the recommendation', bucket: 'Project Context', description: 'Stage three makes the recommendation.' },
      { id: 'pricing_memo', term: 'Pricing memo', bucket: 'Deliverable', description: 'Stage four writes it up in a pricing memo.' },
      { id: 'present_it', term: 'Present it', bucket: 'Deliverable', description: 'Stage five presents it.' },
    ],
    segments: [
      {
        id: 'intro',
        label: 'Intro',
        open: 'p-b1-1',
        lines: [
          { t: "Hey, good to meet you. I'm Eryn, I'll be your manager on this one." },
          { t: "So I wanna jump right in, 'cause we've got a big call to make here at Spotify, and right now nobody can make it.", cues: [{ on: 'big call', a: 'show', id: 'pill-cover' }] },
          { t: 'You good to follow along while I walk you through it?' },
        ],
      },
      {
        id: 'problem',
        label: 'Problem',
        open: 'p-b2-1',
        lines: [
          { t: 'Alright, so think of a price like a volume knob.', cues: [{ on: 'like a volume', a: 'show', id: 'st-knob' }] },
          { t: 'You turn it up a little and nobody notices, but you turn it too far and people walk out of the room.', cues: [{ a: 'set_panel', id: 'p-b2-2' }, { on: 'too far', a: 'show', id: 'st-far' }] },
          { t: "So here's what's going on. Spotify raised Premium prices in six markets last year.", ctx: 'six_markets', cues: [{ on: 'Spotify raised', a: 'set_panel', id: 'p-b2-3' }, { on: 'six markets', a: 'show', id: 'num-six' }, { on: 'markets last', a: 'show', id: 'lbl-six' }] },
          { t: 'So that means we turned six knobs.' },
          { t: "A couple of them didn't care. A couple lost a lot of people.", ctx: 'mixed_reaction', cues: [{ a: 'set_panel', id: 'p-b2-4' }, { on: "didn't care", a: 'show', id: 'cc-held' }, { on: 'lost a lot', a: 'show', id: 'cc-lost' }] },
          { t: 'Now leadership wants to know where we raise next, and by how much.', ctx: 'where_next', cues: [{ on: 'where we raise', a: 'set_panel', id: 'p-b2-5' }, { on: 'by how much', a: 'show', id: 'st-much' }] },
          { t: 'So which knob do we touch, and how far do we turn it?' },
          { t: "And right now, nobody can answer that, 'cause the data's a mess.", ctx: 'messy_data', cues: [{ on: 'nobody can', a: 'set_panel', id: 'p-b2-6' }, { on: "the data's", a: 'show', id: 'st-mess' }] },
          { t: "We pulled the raw export, and there are ten things wrong with it, so basically we'd be turning knobs in the dark.", ctx: 'ten_issues', cues: [{ on: 'raw export', a: 'set_panel', id: 'p-b2-7' }, { on: 'ten things', a: 'show', id: 'num-ten' }, { on: 'things wrong', a: 'show', id: 'lbl-ten' }] },
        ],
      },
      {
        id: 'outcome',
        label: 'Outcome',
        open: 'p-b3-1',
        lines: [
          { t: 'Okay, so what does good look like here?' },
          { t: 'You come back with one clear recommendation.', ctx: 'one_recommendation', cues: [{ on: 'one clear', a: 'set_panel', id: 'p-b3-2' }] },
          { t: 'Not a list of options, not a maybe, just one call that answers two things.', cues: [{ on: 'one call', a: 'set_panel', id: 'p-b3-3' }] },
          { t: 'First, where do we raise next?', cues: [{ on: 'where do', a: 'show', id: 'cc-where' }] },
          { t: 'And second, by how much?', cues: [{ on: 'by how', a: 'show', id: 'cc-much' }] },
          { t: "So when leadership asks why that knob and why that far, you've got the numbers right there, market by market.", ctx: 'back_it_up', cues: [{ on: 'why that knob', a: 'set_panel', id: 'p-b3-4' }, { on: 'the numbers', a: 'show', id: 'st-numbers' }] },
          { t: 'Make sense?' },
        ],
      },
      {
        id: 'process',
        label: 'Process',
        open: 'p-b4-1',
        lines: [
          { t: "Cool, so here's how you're gonna get there." },
          { t: "I've split it into five stages, and each one ends in something real you hand me.", cues: [{ on: 'five stages', a: 'show', id: 'st-five' }] },
          { t: "First, you clean the dataset, and that's about fifteen minutes.", ctx: 'clean_dataset', cues: [{ a: 'set_panel', id: 'p-b4-2' }, { on: 'clean the', a: 'show', id: 'tl-1' }] },
          { t: "You find what's wrong with the export, you get Claude to fix it, and you send me back a clean CSV." },
          { t: "Second, you build the revenue model, market by market, and that's the big one, about twenty-five minutes, 'cause that's where you find out how far each knob can really go.", ctx: 'revenue_model', cues: [{ on: 'build the', a: 'show', id: 'tl-2' }] },
          { t: "Third, you make the recommendation, so that's about fifteen minutes to make the call.", ctx: 'make_recommendation', cues: [{ on: 'make the recommendation', a: 'show', id: 'tl-3' }] },
          { t: 'Fourth, you write the pricing memo, another fifteen.', ctx: 'pricing_memo', cues: [{ on: 'write the', a: 'show', id: 'tl-4' }] },
          { t: "And last, you present it, and that's about twelve.", ctx: 'present_it', cues: [{ on: 'present it', a: 'show', id: 'tl-5' }] },
          { t: "I'm right there with you the whole way, so if you get stuck, you just ask me.", cues: [{ on: 'get stuck', a: 'set_panel', id: 'p-b4-3' }] },
          { t: 'Sound like a plan?' },
        ],
      },
      {
        id: 'outro',
        label: 'Outro',
        open: 'p-b5-1',
        lines: [
          { t: "Okay cool, glad the plan's clear." },
          { t: "I know it sounds like a lot, but honestly you're just finding out which knob and how far." },
          { t: "Alright, that's the whole thing. Let me make sure we're on the same page." },
          { t: "I've got a few quick questions. You ready?", cues: [{ a: 'set_panel', id: 'p-b5-2' }] },
        ],
      },
    ],
  },
  amazon: {
    company: 'Amazon',
    title: 'Build an App That Fact-Checks Amazon Announcements',
    scenarioId: '2d6b9e41-8a37-4c15-b2f0-7e1a4c3d6f52',
    runId: 'c4f2a860-1d9b-47e3-95c6-8b3e0d7a2f64',
    person: { id: '8b2e5d17-94c3-4a6f-a1d8-2f7c6b0e3d95', name: 'Aaron Lee', role: 'Manager', initials: 'AL' },
    voice: 'am_michael',
    logo: '../../logos/logo-amazon.svg',
    tokens: {
      brand: '#FF9900',
      brand2: '#E08700',
      brand3: '#A86500',
      onHero: '#0B0B0B',
      onHeroDim: 'rgba(11,11,11,.72)',
      pillBg: 'rgba(11,11,11,.14)',
      pillLine: 'rgba(11,11,11,.32)',
      logoFilter: 'brightness(0) invert(1)',
      logoFilterFill: 'none',
    },
    panels: panelsAmazon,
    points: [
      { id: 'hard_to_check', term: 'The problem', bucket: 'Problem', description: 'Amazon puts out announcements all the time, and a lot of the claims in them are hard to check.' },
      { id: 'fact_check_app', term: 'The app', bucket: 'Goal', description: "We're building an app that reads an announcement and checks every claim." },
      { id: 'three_results', term: 'Results', bucket: 'Goal', description: 'Every claim comes back verified, unverified, or unsupported, with its source.' },
      { id: 'set_up_first', term: 'First stage', bucket: 'Project Context', description: 'First you set up the project: the GitHub repo, the private keys, the first front-end.' },
      { id: 'connect_model', term: 'Connect the model', bucket: 'Project Context', description: 'Second you connect the model.' },
      { id: 'trace_test', term: 'Trace and test', bucket: 'Project Context', description: 'Third you trace and test it.' },
      { id: 'ship_it', term: 'Ship it', bucket: 'Deliverable', description: 'Last you ship it.' },
    ],
    segments: [
      {
        id: 'intro',
        label: 'Intro',
        open: 'p-b1-1',
        lines: [
          { t: "Hey, I'm Aaron. I'll be your manager on this one." },
          { t: 'You good to follow along for a minute?' },
        ],
      },
      {
        id: 'problem',
        label: 'Problem',
        open: 'p-b2-1',
        lines: [
          { t: "So here's the problem. Amazon puts out announcements all the time, and a lot of the claims in them are hard to check.", ctx: 'hard_to_check', cues: [{ on: 'a lot of', a: 'show', id: 'st-hard' }] },
          { t: "So think about the fact checker at a newspaper, nothing runs until every claim's been checked.", cues: [{ on: 'fact checker', a: 'set_panel', id: 'p-b2-2' }, { on: 'nothing runs', a: 'show', id: 'st-runs' }] },
        ],
      },
      {
        id: 'outcome',
        label: 'Outcome',
        open: 'p-b3-1',
        lines: [
          { t: "We're building an app that reads an announcement and checks every claim, with sources.", ctx: 'fact_check_app' },
          { t: "So that's our fact checker, and every claim comes back verified, unverified, or unsupported, with the source right next to it.", ctx: 'three_results', cues: [{ on: 'every claim', a: 'set_panel', id: 'p-b3-2' }, { on: 'verified, unverified', a: 'show', id: 'cc-v' }, { on: 'unverified, or', a: 'show', id: 'cc-u' }, { on: 'unsupported', a: 'show', id: 'cc-s' }] },
        ],
      },
      {
        id: 'process',
        label: 'Process',
        open: 'p-b4-1',
        lines: [
          { t: "But first things first, you're setting up the project, so we've got something real to build on.", ctx: 'set_up_first', cues: [{ on: 'something real', a: 'show', id: 'st-setup' }] },
          { t: "First, you set up the environment, so that's a GitHub repo, your API keys kept private, and a first front-end, about twenty-five minutes.", cues: [{ a: 'set_panel', id: 'p-b4-2' }, { on: 'set up the', a: 'show', id: 'tl-1' }] },
          { t: "Second, you connect the model, and that's another twenty-five.", ctx: 'connect_model', cues: [{ on: 'connect the', a: 'show', id: 'tl-2' }] },
          { t: 'Third, you trace and test it, about twenty.', ctx: 'trace_test', cues: [{ on: 'trace and', a: 'show', id: 'tl-3' }] },
          { t: 'And last, you ship it, about fifteen.', ctx: 'ship_it', cues: [{ on: 'ship it', a: 'show', id: 'tl-4' }] },
          { t: 'Sound good?' },
        ],
      },
      {
        id: 'outro',
        label: 'Outro',
        open: 'p-b5-1',
        lines: [
          { t: "Alright. Let me make sure we're on the same page." },
          { t: 'You ready?' },
        ],
      },
    ],
  },
};
