/* Which project this load plays, from ?project=amazon, default spotify. Plain data with no app imports:
   mocks.ts reads it before any app module runs. */
import runSpotify from '../../data/run_spotify.json';
import runAmazon from '../../data/run_amazon.json';
import type { KickoffProject } from '../../content/check';

export const PROJECT: KickoffProject =
  new URLSearchParams(location.search).get('project') === 'amazon' ? 'amazon' : 'spotify';

export interface RunContextPoint {
  id: string;
  term: string;
  description: string;
  bucket?: string;
}
export interface RunLine {
  line_id: string;
  text: string;
  context_point_id: string | null;
}
export interface RunSegment {
  id: string;
  lines: RunLine[];
}
export interface RunRow {
  scenario_id: string;
  cast: Array<{ person_id: string; name: string }>;
  context_points: RunContextPoint[];
  lines: { segments: RunSegment[] };
  metadata: {
    speaker_role: string;
    company_name: string;
    scenario_title: string;
    avatar_initials: string;
  };
}

export const RUN = ({ spotify: runSpotify, amazon: runAmazon } as unknown as Record<KickoffProject, RunRow>)[PROJECT];

export const FACE: Record<KickoffProject, string> = {
  spotify: 'static/faces/eryn.webp',
  amazon: 'static/faces/aaron.webp',
};
