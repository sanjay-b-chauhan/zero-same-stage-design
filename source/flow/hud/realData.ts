/* The real Level and Coach panels read their data from the product's own stores. Here the prototype feeds those
   stores, so the real components render on our XP and our roles, and nothing ever calls a backend:
   - content (levels, copy, coaches, the coach's words): the real contentStore loads the JSON the app ships with;
   - progress: the real progressStore override, worked out from the HUD's shown XP, so it counts as a coin lands;
   - ladder and each level's roles: a private QueryClient, seeded under the signed out key. The auth query is seeded
     as signed out, so every user query stays disabled and only ever reads what is seeded here. */
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/renderer/windows/newMainUI/lib/queryKeys';
import { ladderSchema } from '@/renderer/features/coachLevels/contracts/ladderSchema';
import type { Level } from '@/renderer/features/coachLevels/contracts/levelSchema';
import type { Progress } from '@/renderer/features/coachLevels/contracts/progressSchema';
import { unlocksSchema } from '@/renderer/features/coachLevels/contracts/unlocksSchema';
import { useContentStore } from '@/renderer/features/coachLevels/source/contentStore';
import { levelsFrom } from '@/renderer/features/coachLevels/source/useLevels';
import { useProgressStore } from '@/renderer/features/coachLevels/state/progressStore';
import { favicon, rankOf } from './ranks';
import { levelOf, PER_LEVEL, useXp } from './xp';

const TOP = 10;
const SIGNED_OUT = '';

export const hudQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

/* ---------- progress, from the XP the pill shows ---------- */

export function progressOf(shown: number): Progress {
  const level = levelOf(shown);
  if (level >= TOP) return { level: TOP, nextLevel: null, maxLevel: TOP, band: null, points: null };
  const into = Math.max(0, shown - (level - 1) * PER_LEVEL);
  return {
    level,
    nextLevel: level + 1,
    maxLevel: TOP,
    band: null,
    points: {
      total: Math.max(0, Math.round(shown)),
      into: Math.round(into),
      span: PER_LEVEL,
      toNext: Math.max(0, Math.round(level * PER_LEVEL - shown)),
      pct: Math.min(100, (into / PER_LEVEL) * 100),
    },
  };
}

/* ---------- the ladder, from our ranks and the levels the app ships ---------- */

interface Role {
  title: string;
  company: string;
  domain: string;
  pay: string;
  mode: string;
}

/* ranks.ts holds the portal's first roles for levels 1 to 3; the level files hold the rest */
function rolesOf(level: Level): Role[] {
  const rank = rankOf(level.n);
  const first: Role[] = rank ? rank.roles.map((r) => ({ title: r.t, company: r.co, domain: r.dom, pay: r.pay, mode: r.mode })) : [];
  const seen = new Set(first.map((r) => `${r.title}|${r.company}`));
  return [...first, ...level.roles.filter((r: Role) => !seen.has(`${r.title}|${r.company}`))];
}

const usd = (est: string): number | null => {
  const m = /([\d.]+)\s*k/i.exec(est);
  return m ? Math.round(Number(m[1]) * 1000) : null;
};

/* the portal groups a level's roles by family and seniority; read the same groups off the titles */
function familyOf(title: string): string | null {
  const t = title.toLowerCase();
  if (/analytics engineer|data /.test(t)) return 'data';
  if (/analyst/.test(t)) return 'business_analyst';
  if (/engineer|architect|developer/.test(t)) return 'engineering';
  if (/development representative|sales|account executive/.test(t)) return 'sales';
  if (/marketing|growth/.test(t)) return 'marketing';
  if (/operations|ops/.test(t)) return 'operations';
  if (/product/.test(t)) return 'product';
  if (/design/.test(t)) return 'design';
  if (/finance|pricing/.test(t)) return 'finance';
  return null;
}

function seniorityOf(title: string): string | null {
  const t = title.toLowerCase();
  if (/intern/.test(t)) return 'intern';
  if (/director|head of|lead|manager|principal|staff/.test(t)) return 'lead';
  if (/senior|\bsr\b/.test(t)) return 'senior';
  return null;
}

function roleTypesOf(roles: Role[]) {
  const groups = new Map<string, { family: string; seniority: string | null; roles: number }>();
  for (const r of roles) {
    const family = familyOf(r.title);
    if (!family) continue;
    const seniority = seniorityOf(r.title);
    const key = `${family}|${seniority ?? ''}`;
    const g = groups.get(key) ?? { family, seniority, roles: 0 };
    g.roles += 1;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.roles - a.roles);
}

function companiesOf(level: Level, roles: Role[]) {
  const names = new Map(roles.map((r) => [r.domain, r.company]));
  const domains = [...new Set([...roles.map((r) => r.domain), ...level.logos])];
  return domains.map((d) => ({ company_id: d, name: names.get(d) ?? null, logo_url: favicon(d) }));
}

const stateOf = (n: number, at: number) => (n < at ? 'got' : n === at ? 'current' : n === at + 1 ? 'next' : 'locked');

function seedLevels() {
  const files = useContentStore.getState().files;
  const levels = files ? levelsFrom(files).data : null;
  if (!levels) return;
  const at = levelOf(useXp.getState().shown);
  const rungs = levels.map((level: Level) => {
    const roles = rolesOf(level);
    const companies = companiesOf(level, roles);
    const top = roles.map((r, i) => ({
      job_id: `${level.n}-${i}`,
      title: r.title,
      company_name: r.company,
      logo_url: favicon(r.domain),
      pay: r.pay,
      work_type: r.mode,
      pay_max_usd: null,
    }));
    const count = rankOf(level.n)?.count ?? level.rolesAtLevel;
    hudQueryClient.setQueryData(
      queryKeys.coachLevels.unlocks(SIGNED_OUT, level.n),
      unlocksSchema.parse({
        learner_level: at,
        level: level.n,
        roles_total: count,
        roles: top,
        offset: 0,
        limit: top.length,
        next_offset: null,
        companies,
        saved_opened: null,
        unavailable: [],
      })
    );
    return {
      level: level.n,
      roles: count,
      companies: companies.length,
      pay_max_usd: null,
      pay_avg_usd: usd(level.pay.est),
      top_roles: top,
      top_companies: companies,
      state: stateOf(level.n, at),
      role_types: roleTypesOf(roles),
    };
  });
  hudQueryClient.setQueryData(
    queryKeys.coachLevels.ladder(SIGNED_OUT),
    ladderSchema.parse({ learner_level: at, levels: rungs, unknown_level_roles: 0, unavailable: [] })
  );
}

/* ---------- one start, from the HUD ---------- */

const syncProgress = () => useProgressStore.getState().setOverride(progressOf(useXp.getState().shown));

let started = false;

/* call before each open too: a cache entry nobody watches is dropped after a while, so it is put back */
export function seedHud() {
  hudQueryClient.setQueryData<string | null>(queryKeys.user.supabaseAuth(), null);
  syncProgress();
  seedLevels();
}

export function startHudData() {
  if (started) return;
  started = true;
  seedHud();
  void useContentStore.getState().load().then(seedLevels);
  useXp.subscribe((s, prev) => {
    if (s.shown === prev.shown) return;
    syncProgress();
    if (levelOf(s.shown) !== levelOf(prev.shown)) seedLevels();
  });
}
