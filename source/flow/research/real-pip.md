**Paths.** B = `/Users/sanjaychauhan/claudecode/zero-core-ui/worktrees/stage-proto/src/renderer/windows/d1pip/p2pip`. M = `/Users/sanjaychauhan/claudecode/zero-core-ui/worktrees/stage-proto/src/renderer/windows/newMainUI/pilotWebUI/components`. OTP = B/ObjectiveTimerPIP.tsx. N = B/components/new-components. RP = N/RegularPip.tsx, PCH = N/PipCardHeader.tsx, PI = N/PipInput.tsx, PRM = N/PipReviewMode.tsx.

**Against the founder's list**
- Slots: no such UI found. Nearest is feedback `todoItems` ticks, which lock submit (RP:254-260, PCH:91).
- Submit: header check opens the OS file picker (OTP:6891-6898), yet its tooltip says "Get Feedback". PRM opens only via captured content, main-window sync or `handleReview` (OTP:251-284, 1786, 3053).
- Feedback: inline chat rows, no panel (N/PipExpandedContent.tsx:294-330).
- Big screen: ExternalLink calls `restoreMainWindow` (PCH:164-180). Reverse is `#pipBtn` (M/StageWorkspace/components/composer/ComposerControls.tsx:170-181).
- POU: progress bar, start button, voice dock, Continue pill (RP:385-389, 485-486; PCH:206-216).
- Dead code: `PipHuddleMode`, `PipComposerTools` and N/ThinkingDots.tsx have no live JSX mount in d1pip or newMainUI (ThinkingDots only inside PipHuddleMode).

**1. Sizes**

| State | W×H | Trigger |
|---|---|---|
| Collapsed | 64×64; 64×92 with deadline | Chat closed, mode `timer` (OTP:6928-6954) |
| Forced collapsed | 64×64 | No active objective, off stage page (N/ForcedCollapsedAvatar.tsx:6) |
| Regular, the only open size | 400×500 | `chatExpanded`, stage transition, notification (OTP:6915, 6976-6977) |
| Review | 400×auto, ≈300 derived | Mode `review`, not recording (OTP:6976-6977) |
| Other | Cowork 300×300; POU/presentation min-width 450, auto height; sidebar full | OTP:6976-6980 |

Caps 500×700 (B/hooks/useObjectivePipResize.ts:47-54). Frameless, transparent, always on top, no native shadow (`/Users/sanjaychauhan/claudecode/zero-core-ui/worktrees/stage-proto/electron/window/pipWindows.ts`:91-104).

**2. Layout**

Dark, but hardcoded. No `.dark` class is set in B/index.tsx or OTP. B/styles/theme.css loads `--background #ffffff`, `--primary #030213`, `--muted #ececf0`, `--muted-foreground #717182`, `--border rgba(0,0,0,.1)`, `--radius .625rem`, Inter (lines 5-33, 82). Its `.dark`: `--background oklch(.145 0 0)`, `--muted oklch(.269 0 0)`, `--primary oklch(.985 0 0)` (45-55). Learn mode turns the card light (RP:350-353). Icons: lucide-react, plus lock.svg, sample_brief.svg, composer icons.tsx.

Shell: `bg-black/90`, 1px white/9, radius 32; inner `bg-white/10 backdrop-blur-3xl` (OTP:6960, 7009).

Collapsed (RP:601-842): three fused 32px blobs rgb(30,44,35), goo blur 5, rim #B2FFC4 at .4; monogram 36; ring 56, stroke 2.5, #7fd894, overtime #e8775a; unread dot 12; countdown pill 10px bold. No shadow.

Regular, top to bottom (RP:316-568):
- Card: #1B1B1D, 1px white/5, radius 28, shadow-2xl.
- Drag handle: 20×4, white/20, pt 4, pb 8.
- Header: px 12.
- POU bar when active: 12px uppercase white/50.
- Chat: bubbles 12.5/1.5, radius 14, padding 8/12, gap 12 (M/StageDetailsPage/workspaceChat/workspaceChat.css:120, 140). "Latest" pill white/90, 12 semibold.
- Dock: p 12, pt 4; 40 avatar, 1px conic white ring, gap 10; composer.

Resources (N/PipResourcesPanel.tsx:21-35, N/PipWorkspaceResourcesList.tsx:55-74): above the card, gap 12, 280-520 high, radius 24. Title 13 medium white/70; X 16; section 10 uppercase, tracking 1.2, white/40; rows 12.5 white/80, icon 14.

Preview (N/PipPreviewPanel.tsx:44-69): fixed 280, radius 24; inner radius 16, border white/10; documents on white.

Review (PRM:544-561, 1007-1037): avatar 40; title 18 semibold; subtitle 14 at 40%; close ≈45 circle; dropzone 192 high, radius 24, white/10, dashed stroke. Submit: #E2E2E2 pill (PRM:844).

**3. Header** (PCH:112-239), in order:
1. Title: 14 medium white, no clamp.
2. Timer chip: countdown to delivery, hidden without deadline. 11 semibold tabular, Clock 12, #7fd894 on white/8; overtime #e8775a with `+`. Format `m:ss`, no hours (PCH:48-66).
3. Chevron: 36 button, icon 20, neutral-400.
4. Protection dot: 2px inside 8px button; green, amber pulse, red.
5. Main window: 32 circle, icon 14.
6. Resources: 32 circle, only if resources exist.
7. Check: 32, #E2E2E2, icon 16; locked shows 8px lock at .5. Hidden in POU and Learn; Continue pill replaces it when POU allows.

B/components/TaskTimerHeader.tsx renders only in the POU/presentation branch (OTP:7163-7173): elapsed 17px, `mm:ss` to `d:hh:mm:ss` (B/utils.tsx:607-615), title 15, white Review button, 1px white/10 rule.

**4. Composer**

Two exist: PipWorkspaceComposer when main broadcasts state, else PipInput (RP:188, 547).

PipInput (PI:275-503): #2C2C2E/80, blur-md, radius 24, min 48. Textarea 16px, 1-4 rows, "Ask for help". Plus (20) opens portalled menu: Upload, Screenshot. Mic swaps to 32 white send on typing. Enter sends. A file replaces the textarea, and sending it submits for evaluation, not chat (PI:245-251). Mic is click, not hold: X, 20-bar waveform, mono timer, 36 #EBEBF5 send; transcript lands in the textarea.

Workspace (M/StageDetailsPage/workspaceComposer/workspaceComposer.css:143-172): pill #282828, radius 13, 12.5px, 30 buttons, 16 icons. Actions relay to main; attach uses a picker (B/hooks/usePipComposerSync.ts:73-93).

Hold to talk exists only in POU voice answer (N/PipPouVoiceAnswer.tsx:25; M/TrainingShared/Chat/HoldToTalk.tsx:35, 313-318, 386, 404-406): hold Space, under 1s ignored, Esc cancels. Label "HOLD 'SPACE' TO TALK". Pill 124→536×74, scaled .6 at this width.

**5. Open and close**
- Resources: header toggle; closes via X, toggle or row pick. Opacity plus y -10→0, .2s easeOut. Wins over preview (RP:318-342).
- Preview: chat file or rail row; closes via X, Esc, chevron. Same .2s. Web links open externally (N/PipPreviewPanel.tsx:29-33).
- Review: hard swap, no transition (OTP:7012-7049). Closes via X or Submit. Errors slide .6s [.16,1,.3,1], exit .4s (PRM:86-116).
- Orb to card: hard swap (RP:300-313). Expansion anchors to nearest screen corner; collapse restores position (`/Users/sanjaychauhan/claudecode/zero-core-ui/worktrees/stage-proto/electron/window/pipStateIpc.ts`:173-201).
- Learn/Plan/Do body: fade .22s easeOut (RP:399-402).

**6. Motion**

Live springs: only 500/30 on POU check icons (OTP:7290, 7300). Regular PIP has none. Unmounted Huddle: 300/28, 240/18 mass .5, 400/15 (N/PipHuddleMode.tsx:401-453).

Tweens: input height .3s [.32,.72,0,1]; plus menu .15; avatar hover 1.05, tap .95; waveform .1; message 300ms ease-out; ring pulse 1.6. Global easing cubic-bezier(.4,0,.2,1) (B/styles/pipStyles.css:32). Composer cubic-bezier(.625,.05,0,1), .24/.48/.6s (workspaceComposer.css:47-50). Hold pill .42 [.22,1,.36,1]; fade .28 with 10px blur.

**7. Weak** (px figures derived)
1. Crowding. Seven header items leave the title ≈126px, unclamped, so 60 characters runs about 4 lines. The window stays 500 with a panel open: card 206, minus handle 16, header 40, dock 64, leaves ≈85px of chat.
2. Inconsistent. Radii 32/28/24/13; buttons 36/32/30/8; input 16 vs 12.5; greys #1B1B1D, #2C2C2E, #282828; Inter vs Google Sans (RP:316, N/PipExpandedContent.tsx:373); `m:ss` vs `mm:ss`. Recording timer adds 1 every 500ms, so it runs double speed (PI:94-97).
3. Hidden. Submit is an unlabelled tick that opens a picker. Protection is a 2px dot, no tooltip (PCH:143-160). The 40px avatar looks tappable but only ends a live session, and its tooltip is empty (RP:292, 491-543). Orb menu is right-click only (RP:652-657). Drag works only from the handle (N/PipDragHandle.tsx:18). Chevron has no label (PCH:128-136).