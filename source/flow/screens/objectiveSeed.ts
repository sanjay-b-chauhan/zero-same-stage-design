/* Everything the real ObjectiveView reads, seeded from our project. The stores and the query cache are the only seam. */
import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/renderer/windows/newMainUI/lib/queryKeys';
import { stageProgressQueryKey } from '@/renderer/windows/newMainUI/pilotWebUI/services/stageProgressCache';
import { useNPCStore } from '@/renderer/windows/newMainUI/stores/npcStore';
import { useProjectBriefStore } from '@/renderer/windows/newMainUI/stores/projectBriefStore';
import { useUserStore } from '@/renderer/windows/newMainUI/stores/userStore';
import runSpotify from '../../data/run_spotify.json';
import runAmazon from '../../data/run_amazon.json';
import { AMAZON } from '../data/amazon';
import { SPOTIFY } from '../data/spotify';
import type { ProjectId, ProjectMeta, StageState } from '../types';

export const NPC_ID = 'npc-manager';
const USER_ROLE: Record<ProjectId, string> = { spotify: 'Pricing Analyst', amazon: 'Engineer' };

interface BriefCopy {
  description: string;
  challenge: string;
  goal: string;
  tools: Array<{ id: string; name: string; logo: string }>;
}

const BRIEFS: Record<ProjectId, BriefCopy> = {
  spotify: {
    description: 'Figure out what Spotify should charge, market by market.',
    challenge: "We've got pricing data for every market, but the file is a mess. Until it's clean, nobody can say what people are willing to pay.",
    goal: 'Tell us where to raise prices and by how much, in one clear recommendation you can defend in the room.',
    tools: [
      { id: 'claude', name: 'Claude', logo: 'static/logos/logo-claude.svg' },
      { id: 'sheets', name: 'Google Sheets', logo: 'static/logos/logo-sheets.svg' },
    ],
  },
  amazon: {
    description: 'Get an app that fact-checks Amazon announcements running, from a clean setup.',
    challenge: "Announcements go out fast and nobody checks them against the source. You're setting up what makes that check possible.",
    goal: 'A working development environment, pushed and ready for the first feature.',
    tools: [
      { id: 'claude-code', name: 'Claude Code', logo: 'static/logos/tool-claudecode.webp' },
      { id: 'github', name: 'GitHub', logo: 'static/logos/github.svg' },
    ],
  },
};

/* the engine sets project; until it has, the query string picks, the same way takeFor picks the voice */
export const fallbackProject = (): ProjectMeta =>
  new URLSearchParams(location.search).get('project') === 'amazon' ? AMAZON.meta : SPOTIFY.meta;

export const scenarioIdOf = (p: ProjectMeta) => `scn-${p.id}`;
export const objectiveIdOf = (p: ProjectMeta) => `obj-${p.id}`;

/* the flow's own record: ticked rows from doneStages, and an opened stage it has not finished reads Continue */
export function progressRows(project: ProjectMeta, stage: StageState | null, doneStages: string[]) {
  const at = new Date(stage?.startedAt || Date.now()).toISOString();
  const rows = project.stages
    .filter((s) => doneStages.includes(s.id))
    .map((s) => ({ stage_id: s.id, status: 'completed', timings: { start_time: at, end_time: at } }));
  if (!stage || stage.projectId !== project.id || doneStages.includes(stage.stageId)) return rows;
  return [...rows, { stage_id: stage.stageId, status: 'in_progress', timings: { start_time: at } }];
}

export function seedObjective(project: ProjectMeta, stage: StageState | null, doneStages: string[], qc: QueryClient) {
  const sid = scenarioIdOf(project);
  const oid = objectiveIdOf(project);
  const copy = BRIEFS[project.id];
  const stages = project.stages.map((s, i) => ({
    id: s.id,
    objective_id: oid,
    stage_title: s.title,
    stage_description: '',
    stage_type: 'Task',
    sequence_order: i + 1,
    pass_criteria_rubric: 'Scripted in this prototype',
    npc_id: NPC_ID,
    estimated_time_minutes: s.minutes,
    xp_awarded: 100,
    deliverables: [{ title: s.deliverable.label }],
  }));
  const objective = { id: oid, title: project.title, type_of_objective: 'core', sequence_order: 1, stages };
  const prior = useUserStore.getState().user as unknown as Record<string, unknown> | null;

  useUserStore.setState({
    isLoading: false,
    loadUserData: async () => {},
    user: {
      ...prior,
      id: prior?.id ?? 'harness-learner',
      selectedFocus: { id: 'focus', name: 'Business and operations' },
      currentScenario: {
        id: sid,
        title: project.title,
        name: project.title,
        scenario_type: 'micro',
        user_role: USER_ROLE[project.id],
        problem_statement: copy.challenge,
        company_data: { name: project.company },
        objectives: [objective],
      },
      learnerStageProgressDataList: progressRows(project, stage, doneStages),
    },
  } as never);

  useNPCStore.setState({
    npcProfiles: {
      [NPC_ID]: {
        name: project.manager.full,
        role: project.manager.role,
        avatar_url: project.manager.face,
        avatar: { url: project.manager.face },
      },
    },
  } as never);

  useProjectBriefStore.setState({
    projectBriefs: {
      [sid]: {
        title: project.title,
        description: copy.description,
        overview: { role: USER_ROLE[project.id], challenge: copy.challenge, goal: copy.goal },
        tools: copy.tools.map((t) => t.name),
        tool_ids: copy.tools.map((t) => t.id),
        skills: [],
        deliverables: project.stages.map((s) => s.deliverable.label),
        resources: [],
        project_assets: [],
        campaign_details: [],
      },
    },
    whatGoodLooksLike: { [sid]: {} },
    toolIcons: {
      [sid]: copy.tools.map((t) => ({ id: t.id, display_name: t.name, logo_url: t.logo })),
    },
  } as never);

  const none: ReadonlyArray<readonly unknown[]> = [
    queryKeys.training.asset({ objectiveId: oid }),
    queryKeys.objective.whatGoodLooksLike(oid),
    queryKeys.objective.trainingRun(oid),
    queryKeys.scenarioAssets.asset(sid, 'backButtonLogo'),
  ];
  none.forEach((key) => qc.setQueryData(key as unknown[], null));
  qc.setQueryData(['kickoffRuns', sid], project.id === 'amazon' ? runAmazon : runSpotify);
}

/* the real start path reads these two before it navigates. Fresh at the click, so it navigates at once. */
export function seedStageStart(stageId: string, qc: QueryClient) {
  const learnerId = useUserStore.getState().user?.id;
  qc.setQueryData(queryKeys.stage.trainingRun(stageId) as unknown[], null);
  if (learnerId) qc.setQueryData(stageProgressQueryKey(stageId, String(learnerId)), null);
}

export function syncProgress(project: ProjectMeta, stage: StageState | null, doneStages: string[]) {
  const user = useUserStore.getState().user;
  if (!user) return;
  useUserStore.setState({
    user: { ...user, learnerStageProgressDataList: progressRows(project, stage, doneStages) },
  } as never);
}
