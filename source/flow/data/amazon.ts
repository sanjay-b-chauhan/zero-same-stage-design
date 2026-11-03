/* Amazon fact-checking app. Navid's second sample stage on the same engine: the steps are different, the stage works the same way.
   The keys never come through the chat. The slots track that you have them, never what they are. */
import type { ReviewCtx, ReviewItem, ReviewResult, RepoFixture, RubricRow, Scenario, ScreenCtx, StageDef, VerifyResult } from './defs';

/* The dev panel's sample repo. A real link always gets the real GitHub check. */
const USER = 'zero-student';
const MOCK_URL = `https://github.com/${USER}/amazon-fact-checker`;
const isMock = (u: string) => new RegExp(`github\\.com/${USER}/`, 'i').test(u);
const tidy = (u: string) => u.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\.git$/, '').replace(/\/$/, '');
const parts = (u: string) => {
  const m = tidy(u).match(/github\.com\/([\w.-]+)\/([\w.-]+)/i);
  return m ? { o: m[1], r: m[2] } : null;
};

/* a real link gets a real check. A private repo answers 404, same as no repo */
const real = async (u: string): Promise<VerifyResult & { p?: { o: string; r: string } }> => {
  const p = parts(u);
  if (!p) return { ok: false, say: "That doesn't look like a repo link." };
  try {
    const r = await fetch(`https://api.github.com/repos/${p.o}/${p.r}`);
    if (r.status === 404) return { ok: false, say: "I can't access this link. Make it public." };
    if (!r.ok) return { ok: true, limited: true };
    return { ok: true, p };
  } catch {
    return { ok: true, limited: true };
  }
};

const verify = async (u: string, ctx: ReviewCtx): Promise<VerifyResult> => {
  if (isMock(u)) {
    const repo = ctx.repo;
    if (!repo || tidy(repo.url).toLowerCase() !== tidy(u).toLowerCase()) return { ok: false, say: "I can't find that repo. Copy the link from GitHub." };
    if (!repo.public) return { ok: false, say: "I can't access this link. Make it public." };
    return { ok: true };
  }
  return real(u);
};

const rubEnv: RubricRow[] = [
  { id: 'env', test: /\.env\b(?!\.)|env file|environment (file|variable)/i, miss: 'Where do the keys actually go?' },
  { id: 'ex', test: /\.env\.example|example|placeholder/i, miss: 'If someone clones this, how do they know which keys they need?' },
  { id: 'ign', test: /gitignore/i, miss: 'What stops that file going up to GitHub?' },
  { id: 'or', test: /open.?router/i, miss: 'You left out the OpenRouter key.' },
  { id: 'ls', test: /lang.?(chain|smith)/i, miss: 'You left out the LangChain key.' },
];

const DRAFT_ENV = `Set up environment variables for this project.
1. Create a .env file with OPENROUTER_API_KEY and LANGCHAIN_API_KEY.
2. Create a .env.example with the same names and placeholder values.
3. Add a .gitignore for this project.
Don't print my keys.`;

const rubHtml: RubricRow[] = [
  { id: 'in', test: /input|text ?area|text box|paste|field|enter/i, miss: 'Where does someone put the announcement?' },
  { id: 'btn', test: /button|submit|check|start/i, miss: 'How do they start the check?' },
  { id: 'res', test: /verified|unverified|unsupported|result/i, miss: 'What does someone see for each claim? Name the three states.' },
  { id: 'src', test: /source|citation|link/i, miss: "How do I know a claim's real? What goes next to it?" },
  { id: 'html', test: /html|front.?end|page|interface|\bui\b/i, miss: 'What are you asking it to build? Say the file.' },
];

const DRAFT_HTML = `Build a front-end in index.html for an app that fact-checks Amazon announcements.
- An input area to paste an announcement
- A button to start the check
- A results section that marks each claim verified, unverified or unsupported
- The source next to each claim
Keep it one file. No model calls yet.`;

const GOT = /\b(got it|have it|done|created|yes|yep|yeah|ready|i have|made it|got the key|got one)\b/i;

const PUSH: ReviewItem = {
  id: 'push',
  one: 'I only see the README in your repo. Commit and push your work.',
  what: 'Commit and push everything to the repo.',
  why: "I can only review what's on GitHub. What's on your machine doesn't count yet.",
  how: "I'd tell Claude Code to commit and push, then refresh the repo page to check.",
  about: /push|commit|readme/i,
};
const LEAK: ReviewItem = {
  id: 'env',
  one: 'Your .env file is in the repo. Take it out.',
  what: 'Remove .env from the repo and add it to .gitignore.',
  why: 'Anyone who can open this repo can read your keys.',
  how: "I'd tell Claude Code to add .env to .gitignore, remove it from git and push again. Then I'd make new keys, to be safe.",
  about: /\.?env|gitignore|key/i,
};
const PRIVATE: ReviewItem = {
  id: 'private',
  one: "Make your GitHub repository public. I can't access the link.",
  what: "Make your GitHub repository public. I can't access the link.",
  why: 'I need to review your code, and a private repository stops me opening it.',
  how: "I'd open the repo settings, change the visibility to public and test the link again. Make sure there are no secrets in the repo first.",
  about: /public|private|access|link/i,
};
const EXAMPLE: ReviewItem = {
  id: 'example',
  one: "I can't see a .env.example in the repo.",
  what: 'Add a .env.example with the key names and placeholder values.',
  why: "If someone else clones this, that's how they know which keys they need.",
  how: "I'd ask Claude Code to create it from the names in .env, with no real values.",
  about: /example/i,
};

const NOT_REPO: ReviewItem = {
  id: 'wrong',
  one: "That's not your repo link.",
  what: 'Send me the link to the repo you made.',
  why: 'I need to see the repo itself.',
  how: 'Copy it from the GitHub page.',
  about: /link|repo/i,
};

const stage: StageDef = {
  id: 'env',
  deliverable: { label: 'GitHub repository', type: 'Link', takes: 'link', name: 'Repository' },
  flow: [
    {
      id: 'repo',
      kind: 'ask',
      takes: 'link',
      label: 'GitHub repository',
      verify,
      reveal: 'creating a GitHub repo',
      doing: 'Make a public repo, send the link',
      stuck: 'Go to GitHub, make a new repo, make it public, and paste the link here.',
      open: ["Okay, what we need to first do is set up our environment. Let's start by creating a GitHub repo. Hit PIP, make one, and send me the link."],
      nolink: 'Send me the link to your repo.',
      ok: 'Great. That one works.',
    },
    {
      id: 'or',
      kind: 'ask',
      label: 'OpenRouter key',
      yes: GOT,
      concept: { ask: 'Okay, now we need two keys. First, OpenRouter. Do you know what OpenRouter is?', yes: 'Okay, good.', no: 'openrouter', nope: "Okay, here's a video." },
      reveal: 'make a key',
      doing: 'Make an OpenRouter key',
      open: ["Go make a key on openrouter.ai. Don't paste it here. Just tell me when you have it."],
      ok: 'Good.',
      help: "It's on openrouter.ai/keys. Hit create key.",
      remind: 'Let me know when you have it.',
    },
    {
      id: 'ls',
      kind: 'ask',
      label: 'LangChain key',
      yes: GOT,
      concept: { ask: 'Next, LangSmith. Do you know what that is?', yes: 'Okay, good.', no: 'langsmith', nope: "Okay, here's one for that." },
      reveal: 'Make a key',
      doing: 'Make a LangSmith key',
      open: ['Same thing. Make a key, keep it to yourself, and tell me when you have it.'],
      ok: 'Good.',
      help: "It's on smith.langchain.com/settings. Hit create key.",
      remind: 'Let me know when you have it.',
    },
    {
      id: 'envp',
      kind: 'prompt',
      label: 'Environment prompt',
      rubric: rubEnv,
      need: 5,
      draft: DRAFT_ENV,
      reveal: 'store them securely',
      doing: 'Write the environment prompt',
      open: ["Good. We've got both API keys. Now we need to store them securely. How would you prompt Claude Code to set that up?"],
      thin: "Claude Code doesn't know what you've got. Which files do you want, and what goes in them?",
      ok: 'Good. That works. Putting it in the slot.',
    },
    {
      id: 'htmlp',
      kind: 'prompt',
      label: 'Front-end prompt',
      rubric: rubHtml,
      need: 5,
      draft: DRAFT_HTML,
      reveal: 'build the interface',
      doing: 'Write the front-end prompt',
      open: ["Nice. Now let's build the interface. What would you tell Claude Code to create so someone can easily submit an announcement and review the results?"],
      thin: 'What should be on the page? Start with what someone does first.',
      ok: "That's it. Putting it in the slot.",
    },
    {
      id: 'send',
      kind: 'submit',
      label: 'GitHub repository',
      type: 'Link',
      doing: 'Run both, push, send the repo',
      open: ["Now go run both of those in Claude Code. Commit and push. Send me the repo link when it's up."],
      runHelp: 'Paste each prompt into Claude Code and run it. Then tell it to commit and push.',
    },
  ],
  review: async (f, ctx): Promise<ReviewResult> => {
    const u = f.url || f.name || '';
    const items: ReviewItem[] = [];
    if (isMock(u)) {
      const repo = ctx.repo;
      if (!repo || tidy(repo.url).toLowerCase() !== tidy(u).toLowerCase())
        return { items: [NOT_REPO], total: 1 };
      if (!repo.public) items.push(PRIVATE);
      const files = repo.files || [];
      if (!files.includes('index.html')) items.push(PUSH);
      else {
        if (files.includes('.env')) items.push(LEAK);
        if (!files.includes('.env.example')) items.push(EXAMPLE);
      }
      return { items, total: items.length, stats: { n: files.length, vis: repo.public ? 'Public' : 'Private' } };
    }
    if (!parts(u)) return { items: [NOT_REPO], total: 1 };
    const r = await real(u);
    if (!r.ok) return { items: [PRIVATE], total: 1 };
    if (r.limited || !r.p) return { items: [], total: 0, stats: { n: '?', vis: 'Public' }, limited: true };
    try {
      const list = await (await fetch(`https://api.github.com/repos/${r.p.o}/${r.p.r}/contents`)).json();
      const names: string[] = Array.isArray(list) ? list.map((x: { name: string }) => x.name) : [];
      if (!names.includes('index.html')) items.push(PUSH);
      if (names.includes('.env')) items.push(LEAK);
      if (!names.includes('.env.example')) items.push(EXAMPLE);
      return { items, total: items.length, stats: { n: names.length, vis: 'Public' } };
    } catch {
      return { items: [], total: 0, stats: { n: '?', vis: 'Public' }, limited: true };
    }
  },
  reviewSay: (r) => (r.items.length === 1 ? "This looks good, but there's one thing to fix." : `Close. There are ${r.items.length} things to fix. You can ask me about any of them.`),
  approve: 'Awesome. This looks great. I have a few questions now.',
  stats: (r) => {
    const s = r.stats ?? {};
    return [
      [String(s.n), 'files'],
      [String(s.vis), 'repo'],
    ];
  },
  pou: {
    lines: [
      {
        k: 'What',
        text: 'A public repo with the env setup and a front-end you can use',
        q: 'What did you set up in this stage?',
        hear: [/repo|github/i, /env|key|front.?end|html|interface|page|ui\b|set ?up/i],
        more: ["Okay. What's actually in the repo now?", 'Tell me more. What could I open and use?'],
        say: 'A repo with the environment set up and a front-end you can use.',
      },
      {
        k: 'Why',
        text: 'Keys stay out of the code, so they never end up on GitHub',
        q: 'Why do we need an environment file instead of putting API keys directly in our code?',
        hear: [/key|secret/i, /public|github|leak|safe|secure|private|expos|steal|see|read|commit|push/i],
        more: ['What goes wrong if the key sits in the code?', 'Who could see it?'],
        say: 'Keys in code go wherever the code goes, including a public repo.',
      },
      {
        k: 'How',
        text: 'Made the repo, ran two prompts in Claude Code, pushed',
        q: 'Walk me through how you created the repository, configured the environment, and built the HTML interface.',
        hear: [/repo|github/i, /claude|prompt/i],
        more: ['Okay. And then what?', 'Walk me through it in order.'],
        say: 'You made the repo, ran one prompt for the environment and one for the front-end, then pushed.',
      },
    ],
    curve: [
      {
        k: 'One more',
        text: 'Anyone can use your key, and you pay for it',
        when: () => true,
        q: 'What could happen if you accidentally pushed your .env file to GitHub?',
        hear: [/key|secret/i, /use|steal|bill|charge|pay|expos|leak|anyone|public|rotate|revoke/i],
        more: ['And what would you do right after?'],
        say: "Anyone can use your keys on your bill. You'd revoke them right away.",
      },
    ],
    end: "Nice. That's the first stage done.",
  },
  demo: {
    first: () => ({ url: MOCK_URL, name: `github.com/${USER}/amazon-fact-checker` }),
    last: () => ({ url: MOCK_URL, name: `github.com/${USER}/amazon-fact-checker` }),
    repo: (how): RepoFixture => ({
      url: MOCK_URL,
      public: true,
      files:
        how === 'submit'
          ? ['README.md']
          : how === 'first'
            ? ['README.md', 'index.html', '.env', '.env.example', '.gitignore']
            : ['README.md', 'index.html', '.env.example', '.gitignore'],
    }),
  },
};

/* holding to talk: only from state he really has. He never claims to see the screen. */
const screen = (c: ScreenCtx): string => {
  if (c.phase === 'feedback') {
    if (c.firstOpenHow) return `Start with this one. ${c.firstOpenHow}`;
    return c.resub ? 'All ticked. Send me the link again.' : 'All ticked. Hit fix and resubmit.';
  }
  if (c.phase === 'approved') return "Nothing's wrong. Hit Start POU.";
  if (c.phase === 'review') return "I'm reading your repo. One sec.";
  if (c.phase === 'work' && c.stepKind === 'prompt') {
    return c.promptText ? 'Keep going. What else does Claude Code need to know?' : "Nothing in the prompt yet. Tell me what you'd say to Claude Code.";
  }
  if (c.phase === 'work' && c.stepKind === 'ask') return c.surface === 'big' ? "You're still in Zero. Hit PIP and go to your tools." : 'Tell me when you have it.';
  if (c.surface === 'big') return "You're still in Zero. Hit PIP and go to your tools.";
  return c.runHelp ?? 'Looks right. Send me the link.';
};

export const AMAZON: Scenario = {
  meta: {
    id: 'amazon',
    company: 'Amazon',
    logo: 'static/logos/logo-amazon.svg',
    title: 'Build an App That Fact-Checks Amazon Announcements',
    manager: { name: 'Aaron', full: 'Aaron Lee', role: 'Your manager', face: 'static/faces/aaron.webp' },
    stages: [
      { id: 'env', title: 'Set up the environment', short: 'Environment', minutes: 25, deliverable: { label: 'GitHub repository', type: 'Link' } },
      { id: 'ai', title: 'Connect the model', short: 'Model', minutes: 25, deliverable: { label: 'Working fact check', type: 'Link' }, stub: true },
      { id: 'trace', title: 'Trace and test it', short: 'Trace', minutes: 20, deliverable: { label: 'Test report', type: '.md' }, stub: true },
      { id: 'ship', title: 'Ship it', short: 'Ship', minutes: 15, deliverable: { label: 'Live URL', type: 'Link' }, stub: true },
    ],
    end: 'A live fact checker',
  },
  files: {},
  stages: { env: stage },
  stubLines: {},
  secret: /\b(sk-[\w-]{6,}|lsv2_\w{6,}|ghp_\w{6,})\b/,
  leak: "Don't paste keys here. Just tell me you have it.",
  say: {
    ready: "Okay, awesome. So in order to do this project, I've separated it into these stages. Each one has its own deliverable. Let's work through each one together.",
    next: (t) => `Next up, ${t.toLowerCase()}.`,
    back: (n, t) => `Welcome back. You're on stage ${n}, ${t.toLowerCase()}.`,
  },
  screen,
};
