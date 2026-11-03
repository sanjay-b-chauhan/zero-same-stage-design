Roots: `W=/Users/sanjaychauhan/claudecode/zero-core-ui/worktrees/stage-proto`, `R=W/src/renderer`, `N=R/windows/newMainUI`, `C=N/pilotWebUI/components`, `OV=C/ObjectiveView`, `LP=OV/components/LeftPanel.tsx`. Bare `:n` means `OV/index.tsx`.

**The premise is wrong on today's dev: learners normally never see this screen after kickoff.**
- Kickoff end: `C/KickoffMeeting/index.tsx:554` → `N/pilotWebUI/index.tsx:1176` → `goToCards` (`:248`). Micro goes to `/objective/:id` (`:215`). Others go to CampaignCards, then the same route (`C/CampaignCards/index.tsx:613`).
- That route is `ObjectiveViewRoute` (`R/windows/main/MainApp.tsx:118,844`). Its gate renders null, auto-starts the first open stage, and replaces the route (`OV/withNewFlowStageAutoStart.tsx:66-67,94-100,128`).
- `ObjectiveView` paints only with no open stage, a thrown auto-start, or a 20s stall (`N/pilotWebUI/services/stageStartAction.ts:11`).
- The real landing is `StageDetailsPage`: WorkspaceHeader plus WorkspaceRail (`C/StageDetailsPage/view/StageDetailsPageView.tsx:476,487`).
- `ScenarioTransition` is the scenario-completion sequence, so it's irrelevant here (`C/ScenarioTransition/index.tsx:127-141`).

**1. Layout (light theme)**
```
Root size-full relative bg-[#f2f0ed] flex flex-col p-5 (:512)
├ Bg bg-linear-to-b from-[#f3f2f1] via-[#d4e0ee] to-[#719A60]; micro to-[#86ca69] + #3B0AFF hue overlay (:515-525)
├ HUD fixed md:top-8 md:right-8 z-999: LevelBadge, PerformanceChip, HeaderPill (:544)
├ Main flex-1 flex md:flex-row min-h-[600px] max-w-[1920px] mx-auto (:543)
│ ├ Left md:w-2/5 lg:px-12 xl:px-16 2xl:px-20 pt-3 lg:pb-10; stack gap-6 lg:gap-10 (LP:149-151)
│ │ ├ Header: white BackButton, logo h-7 xl:h-8 max-w-[96px], h1 lg:text-[22px] font-stk-bureau-serif tracking-[-0.04em] text-[#2a2118] (LP:156-183)
│ │ ├ Micro chips lg:px-4 lg:py-3 rounded-xl border-[rgba(31,29,30,0.1)], 14/15px semibold (LP:193-197); else 64px round video + Sample Report pill (LP:235,256)
│ │ ├ Tools/Deliverables: 14/15px font-pp-supply-mono uppercase opacity-50; pills h-10 rounded-full border-black/20 (LP:268-304)
│ │ └ Manager 36px avatar; tabs with h-0.5 #0F9F47 underline (ScenarioBriefingSections.tsx:129,309)
│ └ Right flex-1 bg-white/40 rounded-3xl backdrop-blur-md px-[clamp(20px,5vw,112px)] md:pt-24 overflow-y-auto (:580)
│   ├ Active: rounded-3xl bg-white, two-layer shadow, lg:pl-8 lg:py-6; 20px #0F9F47 dot; 19px semibold; Start h-10 px-5 rounded-full from-[#323232] to-[#222] 15px (ActiveTaskCard.tsx:45-47,98-110,125)
│   ├ Row: rounded-[32px] lg:px-8 lg:py-3.5, 18px medium, black or black/40 (TaskRow.tsx:44,88)
│   └ Connector 2px black/10, fill #0F9F47; gap lg:h-7.5 (:610-614,664)
└ CTA "Discuss with my manager" fixed bottom-10 (:85,692)
```
Tokens are in `W/src/index.css`: 3xl=1920px (`:12`), fonts (`:194,196`). BriefModal: right-side `lg:w-[65%]`, white `rounded-4xl h-[95vh]` (`C/Common/BriefModal.tsx:281,313`).

**2. Content → field**
- Eyebrow: micro `company_data.name||title`, else `"Objective "+objIndex`. h1: `objective.title` (`:551-552`).
- Logo: `backButtonLogo` asset, else brand lookup (LP:88).
- Chips: kickoff row; objective WGLL `file_url`; `projectBrief`, labelled Meeting Notes when notes exist (LP:191-225).
- Tools: `ToolIconData.display_name/logo_url`, else `projectBrief.tools` (LP:96-100).
- Deliverables: `projectBrief.deliverables`, else `stage.deliverables[].title` (`OV/utils/scenarioBriefing.ts:127`).
- Manager: first stage's `npc_id` → `npcProfiles[id]` (`:142-145`).
- Earn XP: hardcoded 100/200/400, level from `userXP.total_xp` + `levels` (`C/CampaignLanding/components/scenarioBriefingContent.ts:343,361`).
- Time: summed `estimated_time_minutes`, `~N MIN` (`scenarioBriefing.ts:99-103`). Difficulty, Category: hardcoded (`:124,131`).
- Rows: `stage_title`. Done is `learnerStageProgressDataList[].status==='completed'`. "Continue" is `timings.start_time` without `end_time` (`OV/hooks/useStageProgress.ts:56-77`).

Gotchas:
- Stages need a non-empty `pass_criteria_rubric` or type `Placeholder`; POU is excluded (`useStageProgress.ts:82-95`).
- The project brief text is not rendered here: `brief` is built, then dropped (`ScenarioBriefingSections.tsx:179`). It shows only in BriefModal, and that button is micro-only (LP:189-229).

**3. Dependencies**
Plain objects or setState:
- Props `sendNpcFlowMessage`, `socketClient`, `onStageStart` (`OV/types.ts:17-30`).
- MemoryRouter with `/objective/:id`.
- `useUserStore`: `user`, `isLoading`, and override `loadUserData`, which fires on mount (`useStageProgress.ts:52`).
- `useNPCStore.npcProfiles`; `useUserXPStore.userXP/levels`.
- `useProjectBriefStore.projectBriefs/whatGoodLooksLike/toolIcons`; missing values trigger fetches (`N/hooks/useProjectBrief.tsx:161-167`).
- `setQueryData` (staleTime ≥15 min): `training.asset`, `objective.whatGoodLooksLike`, `objective.trainingRun`, `scenarioAssets.asset(sid,'backButtonLogo')`, `['kickoffRuns',sid]` (`OV/hooks/useObjectiveResources.ts:21-73`, `:228`).

Shim `window.electronAPI.getEnv`: called non-optionally at `R/services/api/httpClient.ts:132` and `R/services/backend/platformBackendClient.ts:128`.

Alias stubs:
- `R/hooks/useStaticMediaUrl.ts`: returns null without the bridge, so chip icons vanish (LP:112,209; `R/utils/staticMedia/staticMediaResolver.ts:25`).
- `R/services/moduleTiming/moduleTimingClient.ts`: calls the BFF (`:115`).
- `OV/hooks/useObjectiveCelebrationReplay.ts`: return `{replayStage:null,dismiss(){}}`.
- `()=>null`: `C/PoU`, `C/CoTraining`, `C/StageDetailsPage/StageCompletion.tsx`, `C/CampaignCards/MeetingReplayModal.tsx`, `OV/VideoModal.tsx`. These are static imports that stay closed until opened. Stubbing them is a precaution to shrink the import graph; I did not confirm they fail.
- `C/KickoffMeeting/hooks/useKickoffNoteCheckerProgress` if BriefModal opens (`BriefModal.tsx:124`).

HUD: HeaderPill is null unless `levels_skills` is on (`R/features/coachLevels/ui/pill/HeaderPill.tsx:67-68`). LevelBadge needs XP>0 (`C/CampaignCards/LevelBadge.tsx:438`). PerformanceChip is null without perf data (`C/PerformanceChip/PerformanceChip.tsx:65`).

Meeting Replay chip: seed a kickoff row and leave `user.currentScenarios` unset, which keeps the completion write off (`N/pilotWebUI/utils/findScenarioIdContainingObjective.ts:8`).

Vite: reuse `@`, `react()`, `tailwindcss()` (`W/vite.config.ts:162-163,283`), drop the electron plugin (`:4`), import `src/index.css`, serve `public/fonts`.

**4. Start**
`ActiveTaskCard.tsx:123` → `handleStageStart` (`:403`) → `runStageStartWithLifecycle` (`stageStartAction.ts:91`) → `openStage` (`:41`):
1. Await `onStageStart`.
2. Prefetch the training run and progress with allSettled (`:53-63`).
3. Navigate to `/objective/:id/stage/:stageId` (`:65`).

Real `onStageStart` resets NPC sockets, sets `currentStage/currentObjective`, sets the plan gate, and clears POU localStorage (`MainApp.tsx:760-812`). No timer or PIP starts on click. Next component: `StageDetailsPage` (`MainApp.tsx:850`).

**5. Timer** (paths under `C/StageDetailsPage`)
- `start_time`: POSTed on stage-page mount if absent (`controller/useStageFeedbackEffects.tsx:374-378`, `N/pilotWebUI/services/stageTimerService.ts:62`).
- Elapsed: 1s tick into a SecondsStore (`controller/useStageElapsedTimers.ts:38-65`). I could not confirm it is ever displayed.
- Visible clock: a countdown in the active card of the left rail (`C/StageWorkspace/components/StageCard.tsx:178-210,689`). "Time left", `H:MM:SS` (`:183,199-200`), mono 13px bold, 3px bar, yellow/orange/red (`workspaceRail/workspaceRail.css:183-192`).
- It is wall-clock: plan `completedAt` + `estimatedDurationMinutes` (`C/StageWorkspace/hooks/useWorkspaceStageCountdown.ts:58,69`). No plan means no clock. Presentation stages have none (`planMode/utils/stagePlanTiming.ts:29`).
- PIP: `newPip.open` sits on the pre-flight path (`controller/useStagePracticeState.tsx:569`), not Start.

**6. Recommendation**
Mount the default export of `OV/index.tsx`, not `ObjectiveViewRoute`, because the gate navigates away.
```tsx
const stages=['Audit data','Find leak','Draft memo','Build deck','Present'].map((stage_title,i)=>({id:`s${i+1}`,stage_title,stage_type:'Task',sequence_order:i+1,pass_criteria_rubric:'x',npc_id:'npc1',estimated_time_minutes:20,xp_awarded:100,deliverables:null}));
const objective={id:'o1',title:'Reduce cancellations',type_of_objective:'core',sequence_order:1,stages};
useUserStore.setState({isLoading:false,loadUserData:async()=>{},user:{id:'u1',currentScenario:{id:'sc1',title:'Acme',scenario_type:'micro',company_data:{name:'Acme'},objectives:[objective]},learnerStageProgressDataList:[{stage_id:'s1',status:'completed',timings:{}}]}} as any);
useNPCStore.setState({npcProfiles:{npc1:{name:'Jay Shah',role:'Manager'}}} as any);
useUserXPStore.setState({userXP:{total_xp:120},levels:[]} as any);
useProjectBriefStore.setState({projectBriefs:{sc1:{title:'Brief',tools:['Claude'],skills:[],deliverables:['Memo']}},whatGoodLooksLike:{sc1:{file_url:'/w.pdf'}},toolIcons:{sc1:[]}} as any);
[queryKeys.training.asset({objectiveId:'o1'}),queryKeys.objective.whatGoodLooksLike('o1'),queryKeys.objective.trainingRun('o1'),queryKeys.scenarioAssets.asset('sc1','backButtonLogo'),['kickoffRuns','sc1']].forEach(k=>qc.setQueryData(k,null));
<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/objective/o1']}><Routes><Route path="/objective/:id" element={<div className="h-screen"><ObjectiveView sendNpcFlowMessage={()=>{}} socketClient={{} as any} onStageStart={()=>{}}/></div>}/></Routes></MemoryRouter></QueryClientProvider>
```
Add routes for `/` and the stage path. Seed the objective WGLL query with `{file_url}` to show that chip.

**Not verified**
- Nothing was run and the mock was never mounted.
- No transitive import graph. One import-time risk exists at `R/windows/CoworkE2V2Window/constants.ts:42`; I don't know if it's in the graph.
- Not traced: LevelBadge internals, `useGifFirstFrame`, and the gate branch in `StageDetailsPageView.tsx:262-303`.