/* Levels 1 to 3, copied from zero-coach-levels b53 (zero-loop-assets-b53/ranks.js, built from the job portal's own roles).
   n, how many roles the level opens, the work it stands for, and its first four roles. Pay is the portal's estimate. */

export interface RankRole {
  t: string;
  co: string;
  dom: string;
  pay: string;
  mode: string;
}

export interface Rank {
  n: number;
  count: number;
  work: string;
  roles: RankRole[];
}

export const RANKS: Rank[] = [
  {
    n: 1,
    count: 10,
    work: 'Book meetings for a sales team: calls, emails, follow ups',
    roles: [
      { t: 'Analytics Engineer Intern', co: 'Coinbase', dom: 'coinbase.com', pay: 'Pay not posted', mode: 'Hybrid' },
      { t: 'Sales Development Representative (NY)', co: 'LangChain', dom: 'langchain.com', pay: 'Pay not posted', mode: 'On site' },
      { t: 'Business Development Representative', co: 'Apollo.io', dom: 'apollo.io', pay: 'Pay not posted', mode: 'Hybrid' },
      { t: 'Business Development Representative (Austin)', co: 'Fivetran', dom: 'fivetran.com', pay: 'Pay not posted', mode: 'Hybrid' },
    ],
  },
  {
    n: 2,
    count: 15,
    work: 'Qualify leads, keep the CRM clean, report what works',
    roles: [
      { t: 'Business Development Representative', co: 'Cohere', dom: 'cohere.com', pay: 'CA$115k to 170k', mode: 'Hybrid' },
      { t: 'Sales Systems Analyst', co: 'Calendly', dom: 'calendly.com', pay: '$82k to 100k', mode: 'Remote' },
      { t: 'Product Led Sales Analyst', co: 'Miro', dom: 'miro.com', pay: '$80k to 98k', mode: 'Hybrid' },
      { t: 'Customer Success Operations Analyst', co: 'Loom', dom: 'loom.com', pay: '$78k to 95k', mode: 'Remote' },
    ],
  },
  {
    n: 3,
    count: 25,
    work: 'Automate the sales process: scoring, routing, handoffs',
    roles: [
      { t: 'GTM Engineer - Sales Workflow Automation, Revenue Intelligence', co: 'Toast', dom: 'toasttab.com', pay: '$94k to 192k', mode: 'Remote' },
      { t: 'GTM Strategy/Operations Associate - New York', co: 'Datadog', dom: 'datadoghq.com', pay: '$100k to 133k', mode: 'Hybrid' },
      { t: 'Sales Development Representative', co: 'Unify', dom: 'unifygtm.com', pay: '$110k to 120k', mode: 'On site' },
      { t: 'Pricing & Order Operations Analyst', co: 'Fivetran', dom: 'fivetran.com', pay: '$104k to 125k', mode: 'Hybrid' },
    ],
  },
];

export const rankOf = (n: number): Rank | null => RANKS.find((r) => r.n === n) ?? null;

export const favicon = (dom: string) => `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(dom)}`;

/* some job board titles join their parts with a spaced hyphen; on screen we join them with a comma */
export const roleTitle = (t: string) => t.replace(/\s+-\s+/g, ', ');
