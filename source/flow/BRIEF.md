# b2 brief. Read this whole file first. It outranks anything you remember.

Build: Zero stage prototype b2. Scripted only, no real AI, nothing leaves the browser.
Work only inside `standalone/` of this worktree. This folder is git-ignored. Never edit a tracked file. Never commit, stash, checkout, reset or push. Absolute paths: repo root is `/Users/sanjaychauhan/claudecode/zero-core-ui/worktrees/stage-proto`.

## What Sanjay said (verbatim, his voice dictation, "peep" means PIP, "R0" means our Zero)

"I told you like the POU experience and the kickoff has to be R0 product, you know, where we have like a voice node exchange and everything, but you just change everything."
"We have to start from the scratch and make it more better experience. Like first we have to take an existing experience, then we have to make it a better experience."
"The peep is horrible, it's a dark mode, the stage screen should be dark mode"
"when you complete the POU, then it should also come and say like we will be first cleaning this, then we're doing this. Like it should break down like, okay, we have this thing, so let's divide into this so you can do it faster, and you got it, then we have the whole objective screen like with the project brief and the stages and all, and we can start the stage and then directly go into the stage screen, the timers and all starts"
"We can have more better peep. A chat icon, okay, for chatting. A resource icon for resource, okay. A peep icon for like zooming and zoom out, something like bigger screen or small screen. And what else was needed? The task screen, what are the tasks we need to follow, like not tasks, so the slots. First, we need to make sure the slot is being done and everything. If it chat and all, you know, same thing. And then once you're done with this, everything, then you have a POU experience inside the peep mode as well and the bigger screen as well. It is to adapt"
"I want you to do the stuff super correct."

b1 (`~/claudecode/zero-stage/b1/`) was rejected as "super bad". Its look, its stage and its PIP are NOT a reference. Only its words and logic may be reused (the founder's script, the keyword matching, the CSV checker). Do not open its CSS for ideas. Never touch that folder.

## The flow, one line

Real kickoff landing, real meeting, real POU voice notes -> breakdown beat (she splits the project into pieces) -> real objective screen (brief + stages) -> Start -> white to black -> NEW dark stage, timer starts -> PIP at any moment -> slots fill -> submit -> feedback -> approved -> stage POU (big or PIP) -> stage done -> next stage.

## Founder model (Navid Nathoo, `~/claudecode/zero-stage/_src/b1/FOUNDER-brief.md`, read the docs at lines 1072 to 1595)

Project -> stages -> steps -> slots. A stage is a sub deliverable, not a workflow step. The manager is proactive: she asks for the thing, then gives direction. The system ticks slots while you talk ("the key is I don't tick it"). Slots are dashes with no numbers. Next step is two dots. A label shows on hover or when ticked. Files come through chat, click opens a preview with Download. Explainer film plays only after a No on her Yes/No. Submit names what you submit and the file type, and unlocks after the steps. Feedback: one sentence, expands to What to fix, Why it matters, How I'd approach it. You tick them, ticked ones collapse, Resubmit unlocks when all are ticked, she re-validates. Acceptance is obvious: "Awesome. This looks great. I have a few questions now." POU: what, why, how, optional curveball. Home says "Continue stage 2 of 5".

## Hard rules

- No em dash, no en dash anywhere, in copy or comments. Ranges say "to".
- No italic. No underline emphasis. No radial or centre glow, no inner glow, no thick translucent ring. No glass, no blur surfaces, no shadows on controls: plain solid slabs with hairlines. No edge to edge dividers: space and enclosure. No eyebrows, no subtitles under clear titles, no body text, no filler micro text, no empty status tags ("Recording", "Listening for 3 points").
- Type: only 12, 14, 16 px, weights 400 and 500, Google Sans Flex (`font-family: var(--font-google-sans-flex)`). Mono (`--font-pp-supply-mono`) only for numbers (timer), never uppercased. Sizes are fixed px, never vh or vw. Letter spacing -0.01em at 14 and 16.
- Spacing tight: 8, 10, 12, 16, 20. Radii from one scale: 8, 10, 12, 16, pill only for dashes. Concentric. Nothing spills its container. Every label optically centred.
- Green means verified by the system only. Otherwise no accent colour.
- Motion: no plain fades. Things rise, scale from origin, slide, with blur to sharp on arrival allowed. Springs: damping 1 response .4 for moves, .8/.3 for sheets. Interruptible. Press state on pointer down (`scale .97`, 100 ms).
- Every interactive thing has hover, press and focus state.
- Never hand-draw logos. Use `lucide-react` for icons (already a dependency), one size 16, stroke 1.75. Real logos are in `standalone/static/logos/`.
- Copy: smart friend plus coach, short, native US spoken. Banned: leverage, robust, seamless, elevate, unlock, empower, harness, delve, navigate, journey, transform, revolutionize, cutting-edge, paradigm, ecosystem, synergy.
- Her name is Eryn Mitchell on Spotify, Aaron on Amazon. Her words from the founder's docs stay as they are.
- Build stamp: "b2" small, visible, bottom left, 12px at 38% ink, in every screen we own. Dev jumps only behind Control+D, never in the product UI.
- No paid generation of any kind. Voices are local Kokoro takes only.
- Mute every test browser (`--mute-audio`). Never control Sanjay's screen. At most two headless browsers at once across all agents: keep each run short, close it. Use the driver `standalone/capture/drive2.mjs` (env PORT, UDD, SHOT_DIR, WIN). Pick your own PORT as told in your task. Use your own scratch folder for shots.
- Build with `cd standalone && ../node_modules/.bin/vite build --config vite.config.ts`, served at http://127.0.0.1:5199/ from `standalone/dist` (already running, do not start another). Builds are 6 s. Do not run `rm -rf` on anything you did not create.
- Test both screens: 1512x800 and 2560x1300. Check at dpr 2 before calling a part done. Look at your screenshots with the Read tool, and be harsh: would an Apple level designer ship it?

## PIP facts (researched, do not re-research)

- Real always-on-top window: Document Picture-in-Picture (`documentPictureInPicture.requestWindow`, Chrome and Edge 116+). Fallback when absent (Safari, phones) or refused: the same DOM as an in-page floating dock, draggable with spring snap to corners.
- One React tree: render the PIP UI with `createPortal` into the PiP document, shared store. Clone all `<style>` and `<link rel=stylesheet>` into it, set `<base>`.
- Chrome's own strip on top is 34 px. Content floor is 240x52. Only a user click can resize (`resizeTo`, consumes the gesture). Her message can never open it. `disallowReturnToOpener: true` hides Chrome's back button, leaving our switch. Closing the window (`pagehide`) returns to the big screen.
- THE trap: when the opener tab is hidden, its rAF stops and its timers throttle. So in anything shown in PIP: no framer-motion, no gsap, no parent rAF. CSS transitions and WAAPI (`el.animate`) only, and all timers through `flow/clock.ts` (it runs on the PiP window's timers when one is open). Because the stage parts are shared by big screen and PIP, this applies to all of `flow/stage` and `flow/pip`.
- Audio and mic stay in the parent document (activation is shared). Ask for mic permission in the big tab (the kickoff POU already does). Keyboard inside PiP: listen on the PiP document too.
- Shape: two heights only. Collapsed row 340x52 (real window about 340x86). Opened 340x560. Width never changes unless a preview or film is open (520x640). The resize snaps, then the body rises after it.

## Screens, in detail

### Breakdown beat (light, warm paper #F2F0ED, continuous with the POU)
On Continue after POU she comes to the centre: her face, a plain solid circle behind it that grows and shrinks with her real voice (read the level from the audio, never a looping fake). No bubble. The problem is the title. The stages are numbered stops on one straight horizontal line, each with its minutes. Nothing shows before she names it. Stops land on her words, one by one, ting on each. The end node of the line is what you'll have ("One clear recommendation"). Then two buttons: "Got it" (main key) and "Again". Got it goes to the objective screen.

### Objective screen (real)
Mount the real `ObjectiveView` from `src/renderer/windows/newMainUI/pilotWebUI/components/ObjectiveView/index.tsx` with Spotify data seeded in its stores. It is real, it stays light. It has the project title, tools, deliverables, the brief (through the real `BriefModal`), and the stage rows with Start. Its real `onStageStart` hands off to our stage.

### Stage screen (dark, new)
Canvas `--z-bg`. Top bar 56 on the canvas (not a panel): back circle, Spotify logo 20, project title 14; in the middle the five stages as plain words, current in a thin outline pill, done with a green tick, future at 38%: these must be very evident; on the right the timer (mono 14, counts down from the stage's minutes, starts the moment the screen lands, amber under 20 percent, overtime `+m:ss`), then the PIP icon.
Below, inset panels with 8 px gaps and margins, radius 16, `--z-panel`:
- Left panel 340 wide: the work. Stage title 16 and what it ends in (a small `.csv` tag). Then the steps in order. The current step shows its slots big. Next step is two dots. A done step folds to one row with a green tick.
  - Issue slots: 10 cells, two columns, 36 high, radius 10, dashed hairline when empty and no text. On fill: the cell scales in solid `--z-raise`, label 12 appears, ting. Hover on an empty one shows nothing about the answer.
  - Prompt slot: one full width card, clearly different, holds the agreed prompt's first lines at 12, with Copy.
  - File slot: full width. Before the steps are done it is locked and dim. When unlocked it becomes the Submit key: "Submit clean dataset" with `.csv`. Press opens the drop area: drag a file, click to upload, or paste a link.
  - Feedback takes over this panel: one sentence per item with a checkbox, click expands What to fix, Why it matters, How I'd approach it. Ticked items collapse to a compact row. "Fix and resubmit" unlocks only when all are ticked.
  - Approved: the file row goes green, the key says "Start POU".
- Centre panel: chat with her, the same chat as PIP. Header 52: her face 28, name 14, resources icon on the right. Her messages plain text 14 on the panel with no bubble, max width 620, centred. Mine small slab on the right. Options (Yes, No) directly under her question. A file she sends is a chip in the thread: icon, name, meta, View, Download. Composer: input 14, attach, hold to talk mic, send. Hold Space outside an input, or Option+Space anywhere, to talk.
- Right panel, only when opened, slides in and pushes: the preview (real table for CSV with sticky header, Download). Or the resources list: everything she has shared, by stage, with View and Download on each. One at a time. Never a centre modal.

### PIP (dark, new, same state)
Row 52: her face 28 (circle behind it follows her voice), dashes filling the centre (one per slot, 3 high, gap 3, done off white, verified green, next two dots at the step boundary, hover or fill shows the label for 2 s in place of the dashes), timer mono 12, then three icon buttons of 32: chat, resources, PIP switch. Slots are one tap on the dashes. Icon set is exactly what he named.
A new message while collapsed: the centre becomes one 12 px line of her words, dashes thin to 2 px beneath, back to dashes after 6 s, a dot stays on the chat icon. Tap opens on that message.
Opened: row, body, input 44. Chat body shows the latest exchange only (my last line small and right, her answer plain 14); scroll up for earlier. Files as chips. Tapping a chip opens the preview in the same window, wider. Resources swap the body. Slots swap the body with the same cells in one column. Action area: when all slots are filled the input row becomes the Submit key. Drop or upload or paste a link in the body. Feedback swaps the body to the checklist, same behaviour as big. Approved: Start POU key.
Switching big and small never loses anything.

### Stage POU (adapts)
What, Why, How, then one curveball when earned. Real voice note language from the kickoff POU: her question is a voice note with waveform, duration, TRANSCRIPT toggle; you hold to talk; your line appears; she reacts. Big screen: left panel shows the lines What, Why, How, One more as blurred rows that pop sharp with a ting when you've said it. Centre is the voice note exchange. PIP: the row's dashes become the 3 or 4 lines; body shows her current question as a voice note plus a 52 high hold slab. Same state, same take. First check whether the real `components/PoU` can be mounted; if it can run at the fake `npc_flow` seam in the dark stage, the big screen should use the real thing.

### Stage done
She says the end line, stage rows tick, next stage shows in the top bar. "Continue stage 2 of 5" is the label on the way back.

## Module map (each owner writes only their files, read anything)

- `standalone/main.tsx` + `standalone/flow/FlowRoot.tsx`: lead.
- `standalone/flow/types.ts`, `flow/clock.ts`, `flow/audio.ts`, `flow/theme.css`: lead. Ask lead for changes by putting a note at the end of your report, or add fields if purely additive.
- `standalone/content/**`, `standalone/static/takes/**`, `standalone/tools/**`, `standalone/stubs/useKickoffStt.ts`, `standalone/flow/kickoff/**`, mic part of `standalone/mocks.ts`: kickoff agent.
- `standalone/flow/engine/**`, `standalone/flow/data/**`: engine agent.
- `standalone/flow/screens/**`: screens agent.
- `standalone/flow/stage/**`: stage agent.
- `standalone/flow/pip/**`: PIP agent.

## Build and test rails (use exactly these)

- Build into your own folder, so nobody breaks anybody: `cd /Users/sanjaychauhan/claudecode/zero-core-ui/worktrees/stage-proto/standalone && Z_OUT=dist-<you> ../node_modules/.bin/vite build --config vite.config.ts 2>&1 | grep -vE 'BadUrl|bg-\\\[url|background-image|│|┆' | tail -5`. `<you>` is your agent name from your task.
- It is served at `http://127.0.0.1:5199/dist-<you>/` (one server, already running from `standalone/`). Never start another server.
- Browser runs: `capture/shot.sh <url> <script.js> <shot dir> [1512,800]`. It holds one of two global browser slots, muted, and waits for a free one. Script body runs in the page: `await __shot('name')` writes a PNG, `sleep(ms)`, `__e` has uncaught errors, the return value prints as JSON. Keep each run under 90 s. Put shots and scripts in your own folder `/private/tmp/claude-501/-Users-sanjaychauhan-claudecode/854423fb-cbe8-45e7-b4d7-857c8bf6196f/scratchpad/<you>/`.
- Other agents write in `flow/` at the same time. Write whole files in one go, keep them compiling. If a build fails inside someone else's module, wait and rebuild. Do not fix their file; report it.
- Our media and logos live in `standalone/static/` and are reached at the relative URL `static/...`.
