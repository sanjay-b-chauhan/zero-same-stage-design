/* What good looks like: the one thing her kickoff said you hand back, read from the same deck, as a plain link on the
   objective and the sample page it opens. Spotify's is the recommendation (two answers and every market behind them),
   Amazon's is every claim checked. The words are hers from the kickoff; the prices are the real export's */
import type { ProjectMeta } from '../../types';
import { DECKS, type Body, type ClaimRow, type PriceTable } from '../deck/panels';

export interface GoodAnswer {
  id: string;
  title: string;
  line: string;
}
export interface GoodTable extends PriceTable {
  names: Record<string, string>;
}
export interface Good {
  title: string;
  type: string;
  lead: string;
  answers: GoodAnswer[];
  why: string | null;
  table: GoodTable | null;
  claims: ClaimRow[];
  /* the sample as a real file, and the name it downloads as. Null: preview only */
  pdf: string | null;
  file: string;
}

type GoodBody = Extract<Body, { t: 'page' }> | Extract<Body, { t: 'claims' }>;
const isGood = (b: Body | undefined): b is GoodBody => b?.t === 'page' || b?.t === 'claims';

const COUNTRY: Record<string, string> = { US: 'United States', MX: 'Mexico', BR: 'Brazil', UK: 'United Kingdom', DE: 'Germany', IN: 'India' };

/* what each answer has to hold, in her words from the outcome chapter */
const ANSWER_LINE: Record<string, string> = {
  'cc-where': 'One market, named, and why it can take the rise.',
  'cc-much': "One step up, in that market's currency, and why not further.",
};

export const goodOf = (project: ProjectMeta): Good | null => {
  const body = DECKS[project.id].map((s) => s.body).find(isGood);
  if (!body) return null;
  if (body.t === 'page')
    return {
      title: body.title,
      type: body.tag,
      lead: 'Not a list of options, not a maybe. One call that answers two things.',
      answers: body.rows.map((r) => ({ id: r.id, title: r.title, line: ANSWER_LINE[r.id] ?? '' })),
      why: 'When leadership asks why that market and why that far, the numbers are right here.',
      table: { ...body.table, names: COUNTRY },
      claims: [],
      pdf: `static/media/${project.id}-recommendation.pdf`,
      file: `${project.company} recommendation, sample.pdf`,
    };
  const last = project.stages[project.stages.length - 1];
  return {
    title: project.end,
    type: last?.deliverable.type ?? '',
    lead: 'An announcement goes in, and every claim comes back verified, unverified or unsupported, with its source right next to it.',
    answers: [],
    why: null,
    table: null,
    claims: body.rows,
    pdf: null,
    file: '',
  };
};
