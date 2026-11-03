# Voicenotes, a real loading system and three style presets

Research for b4, 2 Nov 2026. A note only, no product code. It is written for whoever builds `flow/ds/presets.css` and `flow/ds/Loader.tsx`.

## How to read the numbers

Every number has a tag that says where it came from.

- **[px]** measured from pixels on the Mobbin screens. Mobbin images are 1920 x 1324, with the Mobbin strip from y 1204. The capture scale is 4/3, so the CSS viewport was 1440 wide. I checked this against cap heights: 16 px titles have a 15 device px cap, 14 px body a 13 px cap and 12 px meta about 10.5 px. All [px] values are already divided back to CSS px. JPEG noise is about ±2 per channel. A 1 px CSS hairline lands on 1.33 device px, so it reads lighter than its real token.
- **[css]** computed style from a headless run on the live site (muted, never signed in).
- **[src]** read from the shipped CSS or the registry source.
- **[est]** my estimate, with the reason given.

Every screenshot and source file lives in the session scratch folder, which may be cleared when this session ends. Copy anything you want to keep.

`/private/tmp/claude-501/-Users-sanjaychauhan-claudecode/854423fb-cbe8-45e7-b4d7-857c8bf6196f/scratchpad/voicenotes/`

- `mobbin/`: 52 Voicenotes web screens.
  - `flow-record-1..5` and `home-addnote`
  - `ask-1..6` and `note-ask-1..9`
  - `mindmap-1..8` and `report-1..6`
  - `sub-1..3`, `pages-1..5`, `play-1..5` and `attach-1..4`
- `crops/`: close crops used for measuring.
  - `home-top.png` and `home-record.png`
  - `rec-2-top.png`, `rec-3.png` and `rec-4.png`
  - `loading-states.png`
  - `sub-1-modal.png` and `sub-2-modal.png`
  - Contact sheets: `sheet-ask-mindmap.png`, `sheet-noteask-report.png` and `sheet-rest.png`
- `shots/voicenotes-com/`: the live marketing site and login page.
- `shots/beautifului/`: every loading pattern, captured live.
  - `bui-loading.png`, `bui-thinking-a.png`, `bui-thinking-b.png`
  - `bui-streaming.png`, `bui-tools.png`, `bui-tasks.png`
- `shots/trust-{vercel,linear,mercury,stripe,anthropic}/top.png` and `shots/trust-geist/geist-light.png`: the trust references.
- `vn-src/`: Voicenotes shipped CSS.
  - `spinnerLoader.Dmcsma5O.css`, `modal.3wYjMx_Y.css`
  - `DictationTab.*.css`, `MemosTab.*.css`
  - Inline CSS from home and login.
- `bui-src/`: the beautifului registry.
  - `registry.json`
  - Every `r-*.json` component source
  - `license.html`
- JSON dumps: `vn-*.json`, `bui*.json` and `trust-*.json`.

What I could not reach:
- Voicenotes' signed-in app source, because that needs an account.
- The real Voicenotes dark theme.
- Any hover state, since hover cannot be captured from stills and no headless pointer was used.

The app numbers below therefore come from Mobbin pixels, plus the named colours Voicenotes ships in its public bundle.

---

## Part 1. Voicenotes web

### 1.1 What makes it feel clean (the short version)

1. **One ground.** The page is pure white `#FFFFFF` [px]. There is no canvas and no sheet. The content column floats on white.
2. **Fills instead of outlines.** Every control and card is a flat grey fill, `#F1F1F1` [px]. There are almost no borders. The only lines are a 1 px divider between notes and the hairline round the record dock.
3. **One black object.** The Record key is the only large dark thing on the screen. It always sits bottom centre. Everything else is a grey pill.
4. **Colour is nearly absent.** There is a red dot on Record, a pale green on Done, and the rare blue chip ("Deep think"). Nothing else.
5. **No chrome.**
   - No sidebar and no page title.
   - Top left is the logo only.
   - Top right is three things: plus, a square icon and the avatar.
6. **Status names the real job.** Examples: "Transcribing", "Creating meeting report from your note" and "Thinking possible questions and answers".
7. **Steps show the next one plainly.** In a numbered list only the current step has a live button. The next step's button is drawn pale and disabled (`pages-2`, `pages-5`).

### 1.2 Ground, surfaces and ink

| Role | Value | Tag | Note |
| --- | --- | --- | --- |
| Page ground | `#FFFFFF` | [px] | `home-*`, `flow-*`, every screen |
| Fill (search, chips, pills, cards, composer, textarea) | `#F1F1F1` | [px] | Same on every screen; `sub-2` buttons read `#F3F3F3` |
| Dialog ground (settings) | `#F1F1F1` | [px] | White group cards sit on it |
| Scrim | white turns `#7F7F7F` | [px] | So `rgba(0,0,0,.5)` |
| Title ink | `#000` darkest pixel | [px] | The named `dark` `#0D0D0D` [src] is used 474 times in the bundle |
| Body ink (14 px) | `#545454` to `#616161` darkest pixel | [px] | Not a named token. I use `#555555` |
| Meta (12 px, "Today • 4:26 PM") | `#777777` to `#848484` | [px] | Named `grey71` `#717171` [src], the marketing meta [css] |
| Quiet icon text ("⌘ K") | `#828282` to `#888888` | [px] | Named `grey82` `#828282` [src] |
| Spinner grey | `#9B9B9B` | [src] | Named `grey9B` |
| Selected chip | `#101010` fill, white text | [px] | Black is selection here, not colour |
| Done slab | fill `#EDF5E8`, text `#548742` to `#72A361` | [px] | Named `green42` `#58A942` [src]. Contrast on the slab is only 2.63:1 |
| Record dot | `#FF3931` | [px] | Named `red38` `#FF4538` [src] |
| Deep think chip | blue | [px] | Named `blueFF` `#007AFF` [src]. The blue spinner is `#016FD0` [src] |
| Report rule (left bar on an inserted report) | `#B09550` | [px] | Warm gold. Do not carry it over, because it is warm |
| Brand teal (Pages "Get Started") | `#0E3934` primary, `#274F47` primary47 | [src] | Measured CTA about `#0F5E54` [px, est] |

The named greys Voicenotes ships [src] are:
- Text greys: `grey71 #717171`, `grey82 #828282`, `grey8D #8D8D8D` and `grey9B #9B9B9B`.
- Light greys: `greyCC #CCCCCC`, `greyD9 #D9D9D9`, `greyEE #EEEEEE` and `greyF9 #F9F9F9`.
- Darks: `dark #0D0D0D`, `dark22 #222222`, `darkTheme #1B1C1C` and `darkTheme2 #272829`, plus `#262727` and `#323334`.

All are neutral except `greyEB #E9E9EB` (cool, +2 blue) and the dark set (+1 to +2 green or blue). Neutral versions are used below.

The marketing site differs from the app. It sits on warm cream `#FAF9F5` [css], the same ivory Anthropic uses. The app itself is white. The voice preset follows the app, never the marketing cream.

### 1.3 Lines, shadows and radii

- Divider between notes: 1 px. It measures `#F3F3F3` to `#F6F6F6` [px], which is a blended hairline. The token is likely `greyEE #EEEEEE` [est].
- Settings rows: a 1 px divider that reads `#F3F3F3` [px], so likely `#EEEEEE` [est].
- Record dock plate: the hairline reads about `#F3F3F3` on top and `#E3E3E3` at the bottom [px]. Under it is a soft drop that fades over about 15 px [px].
- Shadows that ship [css or src]:
  - `0 2px 8px rgba(0,0,0,.08)`
  - `0 2px 5px rgba(0,0,0,.05), 0 8px 40px rgba(0,0,0,.04)`
  - `0 24px 60px -12px rgba(0,0,0,.25)` (dialogs)
  - `0 3px 4px rgba(0,0,0,.25)`
  - The mind map tooltip: `0 4px 24px #00000012, 0 0 0 1px #0000000a`, radius 10 [src]
- Radii:

| Element | Radius | Tag |
| --- | --- | --- |
| Search, chips, action pills, keys | full pill | [px] |
| Record key | 24 to 28 on a 56 high key (pill) | [px] |
| Invite button (in a card) | 10 to 12 | [px] |
| Login buttons | 14 at 48 high | [css] |
| Invite card | about 16 | [px] |
| Marketing cards | 12 (`rounded-xl`) or 16 (`rounded-2xl`) | [css] |
| Settings dialog | 22 to 24 | [px, read off the corner profile: insets 15.7, 12.0, 9.0, 6.0, 3.0 and 0.7 px at depths 0.75, 2.25, 4.5, 7.5, 12 and 16.5 px] |
| Settings group card | 12 to 14 | [px] |

- The most common radii in the bundle are 9999, 6, 3, 12 and 16 [src].

### 1.4 Type

- App font: Inter, shipped as separate families (Inter Regular, Medium and SemiBold) [src]. Marketing headings use P22 Mackinac Pro and Instrument Serif [css]; the app does not.
- Sizes [px]:
  - Note title: 16/22, black.
  - Body: 14/19.25, grey, clamped to 4 lines with an ellipsis.
  - Meta: 12, grey71.
  - Timer in the recording state: 18, tabular.
  - Pills: 13 to 14.
- Computed on the site [css]:
  - Body: 16/24.
  - Meta: 12/16 `#717171`.
  - Card text: 16/22 `#0D0D0D`.
  - Secondary text: `rgba(0,0,0,.6)` at 15/22.
  - Nav buttons: Inter Medium 16/21.
  - Keys: "Start for free" is 14/20, and the hero keys are 15 SemiBold.
- For b4, keep our scale (12, 14 and 16 at 400 and 500). Voicenotes uses SemiBold only on the marketing hero; the app keys read as Medium.

### 1.5 The one main action: the Record dock

From `flow-record-1`, `home-record.png` and `rec-*.png`, all [px]:

- It is fixed at the bottom centre, outside the column, so it never scrolls away.
- **Plate:** white, 348 x 76, at x 546 to 894 and y 802.5 to 880.5. That puts it 22.5 from the bottom of a 903 high viewport. It carries the hairline and soft drop from 1.3.
- **Key:** `#0D0D0D` (reads `#0F0F0F`), 328 x 56.5 at x 555.8 to 883.5 and y 813.5 to 870. The plate padding is 10 all round. Radius 24 to 28.
- **Label:** "Record", 16, white, Medium. A red ring dot `#FF4538` sits before it.
- **Quota:** when free minutes run low, "100 minutes left this week" shows under the key in 12 grey.
- **Playing a note** (`play-2..5`): a player row appears under the key, and the dock grows upward. The row holds back 15, pause, forward 15, a speed pill "1x" or "3x", a scrubber with "00:53" and "02:09", and an x to close. The note's own play pill switches from ▶ to ⏸.

What is **not** shown is the lesson:
- No second dark button anywhere.
- No headline over the list and no count.
- No helper text under Record.
- No borders on cards.
- No icons with labels in the top bar.
- No "Get started" banner, except the one Upgrade card when you are on free.

Only one thing is dark and big, so the eye has nowhere else to go.

How it maps to Zero:
- The `zj-key` of a view can take this dock form: bottom centre, 56 high, inside a white plate with 10 padding and a soft drop.
- The rest of the page uses grey `zj-sec` pills.

### 1.6 Spacing and negative space (home, [px])

- Column: x 411 to 1029, so **618 wide on a 1440 viewport (43%)**. That leaves **411 of air on each side (28.5%)**. The kit column is 688 (`.zj-col`).
- Search: y 10 to 47 (37.5 high, pill, `#F1F1F1`). It holds a white "Ask AI" pill, 31 high (y 13 to 43.5), with a soft shadow, and "⌘ K" in grey82.
- Chips: y 67 to 92 (26 high, pills), 20 below the search.
  - "All" is selected: black `#101010` with white text.
  - The others are `#F1F1F1` with ink `#515151` to `#5E5E5E`.
- Invite card: y 109.5 to 199.5 (90 high), 17.5 below the chips, full column width, radius about 16.
  - It holds three faces, a 16 black title, one 14 grey line, and a black "Invite" button 104 x 33 at radius 10 to 12.
- Note item, top to bottom:
  - Meta (12)
  - Title (16/22)
  - Body (14/19.25, up to 4 lines)
  - Action row: a play pill (31 high, `#F1F1F1`, "▶ 02:09" in black Medium) on the left; on the right the pills "Ask AI", "Create" and "Share" (26 high) and a "•••" circle
  - A 1 px divider, then the next note
- Settings dialog (`sub-1`, `crops/sub-1-modal.png`):
  - The dialog is 475.5 wide and 627.7 high, at radius 22 to 24, on a `#F1F1F1` ground.
  - The group cards are white at radius 12 to 14, inset 29 to 30 from the dialog edge, and 417.7 wide.
  - **Rows are 45 high**, with 15 between groups.
  - Labels are 14 black, values are 14 black on the right, then a chevron.
- Recording plate: padding 16 (versus 10 at rest), with 12 between the pause slab and the Done slab.

Air against the kit:
- Cards pad 20 (`rounded-2xl p-5`) [css], where the kit uses 16.
- Settings rows are 45 high, where kit controls are 36 to 38.
- Both ratios are 1.25. So **voice air = 1.25** [est from those two ratios]. This matches the lead's placeholder.

### 1.7 Recording UI

- At rest, the dock shows the black Record key (see 1.5).
- Recording (`flow-record-2`):
  - The plate grows to about 346 x 148, padding 16.
  - Top: a `#F1F1F1` slab, 313 x 52, showing "⏸ 02:03" at 18 tabular. Tapping pauses.
  - 12 below: the Done slab, fill `#EDF5E8`, 52 high, "✓ Done" in green.
  - A small chevron circle sits on top of the plate (y 711 to 744) to collapse it.
  - Nothing else on the page changes.
- Processing (`flow-record-3`):
  - The new note appears at the top of the list as "Recording in progress" (16 black).
  - Under it: a small black blob spinner, "Transcribing" (12 grey), and the timer "02:09" at 16 on its own line.
- Waveform on the site's demo [src]: real-level bars. The rule is `.tw-dictation-wave-bar{transform-origin:center;transition:transform .04s ease-out}`, and each bar is scaled by the live audio level, so it never loops. A muted bar goes to opacity .45 over .2s.

### 1.8 Notes and files as cards

- A note is not a card. It is a list item on white, split from the next by a 1 px line.
- The only filled cards are the Invite or Upgrade card, the meeting report block and the settings groups.
- Files and images attach inline inside the note body (`attach-3`), as plain thumbnails with no frame. A tap opens a dark lightbox (`attach-4`).
- The "•••" menu (`attach-1`, `attach-2`) is a white popover with the label on the left and a small icon on the right. Its items are Share, Create, Record subnote, Attach (which opens Add photo and Attach link), Tag, Fix, Edit and Delete. Delete is the only one in red.
- Generated blocks (`attach-3`, `report-*`) insert into the note:
  - "Custom" blocks with a small grey label.
  - A mind map with coloured nodes.
  - An "Email" block with a "Subject:" line.
  - The meeting report, which carries a left rule and a footer: "Copy · Delete … Meeting report created on Aug 25" in 12 grey.

### 1.9 How the AI's text arrives

- While working, a status line names the job, followed by 3 small dots that cycle [px]:
  - "Creating meeting report from your note", in green with a sparkle icon (text `#71AA65` / `#567549`).
  - "Creating from your note", in a hairline card.
  - "Thinking possible questions and answers", with grey dots `#616161`.
  - "Thinking•••", in a white pill.
- Chat typing bubble: `#E6E6E8` with dots `#7A7A7C` [px].
- Ask AI on a note (`note-ask-*`): the answer comes as **voice first**, a waveform with play and pause. Then the text follows in a white card with a hairline, then an "Other sources" row and a "Copy" pill.
- Word reveal on their site [src]. It is blur to sharp, word by word, which matches his blur rule:
  ```css
  @keyframes tw-reveal-word{0%{filter:blur(8px);opacity:0;transform:translateY(5px)}to{filter:blur(0);opacity:1;transform:translateY(0)}}
  .tw-reveal-word{animation:tw-reveal-word .55s cubic-bezier(.22,.9,.28,1) both;animation-delay:var(--reveal-delay,0s);display:inline-block}
  ```
- Other motion they ship [src or css]:
  - Popover: `dropup` translateY(2%) to 0 over .1s ease. The dropdown goes from -4% over .1s ease-in-out.
  - Colour: .15s cubic-bezier(.4,0,.2,1).
  - Transforms: .15s cubic-bezier(0,0,.2,1).
  - Mind map ease: `--mm-ease:cubic-bezier(.33,1,.68,1)`. Nodes take .72s and 1s; lines are drawn by stroke-dashoffset over 1.25s to 1.45s.

### 1.10 Empty states

- **Ask AI, empty:**
  - A segmented "Ask | Create" (the white chip selected on a grey track) and an "All notes" chip.
  - Then one centred sentence, low on the panel, near the composer: "Ask anything about your notes. Since August 21, 2026, you've recorded a total of 3 notes."
  - It states a fact about **your** data, with a real number. No illustration.
- **Composer:** a grey `#F1F1F1` box, "Ask a question", with a settings icon and a mic. Suggested questions sit above it as grey bubbles.
- **Add a note** (`home-addnote`):
  - A white panel that rises where the dock was.
  - Header: a grey "Back" pill, the title "Add a note", and a pale green "✓ Done" that stays disabled until you type.
  - Under it, a grey textarea with the placeholder "Write a note".
- **Steps** (`pages-2`, `pages-5`):
  - Each step has a number, a 14 title, one or two grey lines, and one button.
  - The current button is solid teal. The next step's button is a pale teal and disabled.
  - Once a step is done it becomes a summary card (face, name, "Edit").

### 1.11 Copy length against ours

| Thing | Voicenotes | Ours now (`flow/open`, `flow/room`) |
| --- | --- | --- |
| Main key | 1 word ("Record") | 2 to 4 words |
| Status | 1 to 6 words ("Transcribing", "Creating meeting report from your note") | `Loader` labels, 2 to 4 words |
| Titles | 2 to 4 words ("Add my profile", "Start your Voicenotes Page") | 2 to 5 words ("Where we raise next", "Build the revenue model") |
| Lines under a title | 0 or 1, at most about 20 words | 1 to 2 short lines |
| Empty state | 2 sentences, 17 words, with a real count | n/a |

Our line length is already on par. The gap is **count**: a Voicenotes view carries one title, at most one line and one key. Cut the number of text items per view, not just their length.

---

## Part 2. A realistic loading system

"Realistic" here means three things:
- The label names the real work.
- The number comes from the real data.
- The time is the time that really passed.

It is never a looping fake list, never a face and never a pulsing ring. These libraries.dev rules still hold:
- No loader for a wait under 2 s.
- A beam only for a wait over 3 s.
- One indicator per active step.
- The state names the activity.

### 2.1 beautifului.dev: source and licence

- A shadcn registry at `https://www.beautifului.dev/r/<name>.json`. The whole source sits in `bui-src/r-*.json`.
- **MIT, Copyright (c) 2026 Shane Levine**, "Built by Turbo" [src, `license.html`]. Rebuilding it with no package is allowed, provided the notice is kept in the source.
- Foundation tokens [src]:
  - Radii: chip 6, control 8, card 10, window 14.
  - `--ease-out-strong: cubic-bezier(0.23,1,0.32,1)`, `--ease-in-out-strong: cubic-bezier(0.77,0,0.175,1)`, `--ease-link: cubic-bezier(0.16,1,0.3,1)`.
  - Body: 14 px at -0.01em, with `font-feature-settings 'cv11','ss01'` (the same as our kit).
- Its light greys are cool [src]: `--ink: oklch(0.247 0.006 258.361)`, `--line: oklch(0.946 0.003 264.542)` and so on. Do **not** copy its colours. Every recipe below uses our `--zj-*` inks.
- The global reduced-motion rule sets every duration to 0.01 ms [src].

Keyframes it ships, exactly [src, `r-foundation.json`]:

```css
@keyframes shimmer-text { from { background-position: 150% center; } to { background-position: -50% center; } }
@keyframes fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pop-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes caret-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
@keyframes eq-bounce { 0%, 100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
@keyframes pixel-on { 0%, 100% { opacity: 0.15; } 18%, 42% { opacity: 1; } 62% { opacity: 0.15; } }
```

### 2.2 Every loading, thinking, shimmer, progress and skeleton pattern on beautifului

**A. LoadingState (the pixel grid).** Screenshot: `bui-loading.png`.

- Looks: a 3 x 3 grid of 4 px cells with a 1.5 px gap. Each cell is square at radius 1 (Drive, Orbit) or round (Dots). The 15 x 15 grid measured live [css].
- Beside it:
  - A shimmering label, 13/19.5 at weight 500 [css].
  - An elapsed timer, JetBrains Mono 12/18 in ink-3, tabular, ticking every 100 ms as "6.5s".
  - A gap of 10.
- Cells rest at opacity .15; an off cell sits at .07.
- Drive patterns [src]:

| Variant | Order | Delay | Cycle |
| --- | --- | --- | --- |
| Drive (chevron) | every cell | `(c + abs(r - 1)) * 90ms` | 650 ms ease-in-out infinite |
| Dots | the same order | the same delay | round cells |
| Orbit | perimeter `[0,1,2,5,8,7,6,3]`, centre off | `k * 110ms` | 950 ms |

- Reduced motion freezes the grid, and the timer still ticks [src].
- Recipe (Drive):
  ```html
  <span class="px" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
  ```
  ```css
  .px{display:grid;grid-template-columns:repeat(3,4px);gap:1.5px;flex:none}
  .px i{width:4px;height:4px;border-radius:1px;background:var(--zj-ink);opacity:.15;animation:pixel-on 650ms ease-in-out infinite}
  .px i:nth-child(4){animation-delay:0ms}
  .px i:nth-child(1),.px i:nth-child(5),.px i:nth-child(7){animation-delay:90ms}
  .px i:nth-child(2),.px i:nth-child(6),.px i:nth-child(8){animation-delay:180ms}
  .px i:nth-child(3),.px i:nth-child(9){animation-delay:270ms}
  /* Orbit: 950ms; perimeter 1,2,3,6,9,8,7,4 get 0,110,...,770ms; centre (5) stays at .07, no animation */
  @media (prefers-reduced-motion:reduce){.px i{animation:none}}
  ```
- `flow/ds/Loader.tsx` and `tokens.css` already rebuild Drive exactly; I checked the delays cell by cell. Three gaps against the source:
  1. The sheen there runs `120% → -120%`. The source runs `150% center → -50% center` over 1400 ms, with `background-size: 200% 100%`.
  2. There is no reduced-motion rule for `.z4-px i`, `.z4-load-label` or `.z4-skel i` in `tokens.css`. Add one.
  3. The timer reads "6.5 s" where the source reads "6.5s". Either is fine; pick one.

**B. Shimmer (text sheen).**

- The same gradient as the label, run at 1.8 s [src]:
  ```css
  .sheen{color:transparent;background:linear-gradient(90deg,var(--zj-ink3) 35%,var(--zj-ink) 50%,var(--zj-ink3) 65%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;animation:shimmer-text 1.4s linear infinite}
  ```
- Use it only on the live label. It must never be the sole sign of work: it carries no information.

**C. ThinkingState (a trace of steps).** Screenshots: `bui-thinking-a.png` and `bui-thinking-b.png`.

- Stage timings in the demo: `[800, 600, 1800, 2600, 1600]` ms [src]. In ours these come from the real work.
- Header:
  - A sparkle icon (`M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z`).
  - Shimmer text "Thinking", which becomes "Thought for 4 seconds" when done (13/500, ink-2).
  - A chevron that turns 180 degrees over 300 ms.
- The body opens by `grid-template-rows: 0fr → 1fr` over 400 ms on `cubic-bezier(.23,1,.32,1)`.
- A 1 px `--line` rail on the left grows its height over 500 ms.
- Rows:
  - Minimum height 28, 12.5/500 ink.
  - A finished step shows a check (`M20 6L9 17l-5-5`) in ink-3.
  - The running step shows a 12 px spinner: border 1.5 px in `--line-strong`, top border ink-2, `spin 700ms linear infinite`.
  - Each row enters with `fade-up 320ms cubic-bezier(.23,1,.32,1) ${i*120}ms`.
- Variants:
  - Steps.
  - Reasoning (paragraphs).
  - Search (a query row, then sources).
  - Coding (Read, Edit and Run rows with +/- counts).
- Recipe for the running row spinner:
  ```css
  .tspin{width:12px;height:12px;border-radius:50%;border:1.5px solid var(--zj-line2);border-top-color:var(--zj-ink2);animation:spin 700ms linear infinite}
  .trow{display:flex;align-items:center;gap:8px;min-height:28px;font-size:12px;line-height:16px;animation:fade-up 320ms cubic-bezier(.23,1,.32,1) both}
  .trace{position:relative;padding-left:14px}
  .trace::before{content:'';position:absolute;left:5px;top:0;width:1px;height:var(--h,100%);background:var(--zj-line);transition:height 500ms cubic-bezier(.23,1,.32,1)}
  ```

**D. TaskRows (jobs that each finish).** Screenshot: `bui-tasks.png`.

- Demo ticks: `[600, 900, 2400, 1400, 2400, 600]` [src].
- Rows:
  - 44 high, radius 22 (14 when open), on the surface with `--shadow-card`.
  - Each enters with `fade-up 450ms ${i*80}ms`.
- Running: a SpinnerRing, 24 px, stroke 2, track `--line`, arc ink-3 with `stroke-dasharray 28 72`, `spin 1.1s linear infinite`. The step number sits inside (10.5/600).
- Done or failed:
  - A 22 px green check or red x badge, with `pop-in 300ms`.
  - A pill, 22 high, 11.5/500, on a green or red tint.
  - "Failed" carries a turning retry icon.
- Detail lines: 12 ink-2, with 11.5 mono meta, staggered `120 + j*100` ms.
- Recipe for the ring (SVG, no package):
  ```html
  <svg width="24" height="24" viewBox="0 0 24 24" class="ring"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--zj-line)" stroke-width="2"/><circle cx="12" cy="12" r="10" fill="none" stroke="var(--zj-ink3)" stroke-width="2" stroke-linecap="round" pathLength="100" stroke-dasharray="28 72"/><text x="12" y="15.5" text-anchor="middle" font-size="10.5" font-weight="500" fill="var(--zj-ink2)">2</text></svg>
  ```
  ```css
  .ring circle:last-of-type{transform-origin:12px 12px;animation:spin 1.1s linear infinite}
  ```
  Spin only the arc, never the number. Use weight 500 for us, not 600.

**E. StreamText (her words arriving).** Screenshot: `bui-streaming.png`.

- 2 characters per 9 ms tick [src].
- The last 6 characters are soft, and a caret follows:
  ```css
  .stream-tail{filter:blur(1.6px);-webkit-mask-image:linear-gradient(to right,#000 20%,rgb(0 0 0/.2));mask-image:linear-gradient(to right,#000 20%,rgb(0 0 0/.2))}
  .stream-caret{display:inline-block;width:2px;height:1.05em;margin-left:1.5px;border-radius:1px;background:var(--zj-ink);vertical-align:-.15em;animation:caret-blink 1s step-end infinite}
  .streaming .stream-caret{animation:none}
  ```
- The caret is solid while text is streaming and blinks only when it waits.

**F. StreamingText (words and sources).**

- Words every 55 ms, then a 3400 ms hold in the demo [src].
- Inline source chips enter with `pop-in 250ms`.
- An action row appears 400 ms after the text is done.
- 13 px, leading-relaxed.

**G. ToolChips (tool calls).** Screenshot: `bui-tools.png`.

- One chip per tool call, `STEP_MS 700` in the demo [src].
- Each chip takes the A or C running state, then a check.

**H. Records pulse (a live dot in a table).**

- `@keyframes records-pulse { 0%,100% { opacity:.35; transform:scale(.8) } 50% { opacity:1; transform:scale(1) } }` [src].
- It is a pulsing dot. Do not use it as a loader (pulsing is banned for loaders).

**I. Skeleton.**

- beautifului has none. Ours (`.z4-skel`, in `tokens.css`) is the right shape: grey pills on a `--zj-well` sheen at 1800 ms.
- Use it only where the exact shape of what is coming is known, for example a stage card about to fill.

### 2.3 Voicenotes' own loaders [src]

- The spinner (`spinnerLoader.Dmcsma5O.css`), exactly:
  ```css
  .loader{animation:l13 1s linear infinite;aspect-ratio:1;background:radial-gradient(farthest-side,#9b9b9b 94%,#0000) top/3px 3px no-repeat,conic-gradient(#0000 30%,#9b9b9b);border-radius:50%;-webkit-mask:radial-gradient(farthest-side,#0000 calc(100% - 3px),#000 0)}
  @keyframes l13{to{transform:rotate(1turn)}}
  ```
  It comes in white, green `#58a942`, red `#ff4538` and blue `#016fd0`. It is a ring with a rounded head: a ring, but not pulsing. Use it at most inside a key while that key's own action runs.
- Flashing dots (the "•••" after a status). These are 6 px dots, 8 px apart, flashing their colour:
  ```css
  .dot-flashing-dark{position:relative;width:.375rem;height:.375rem;border-radius:9999px;background:#0d0d0d;animation:dotFlashing-dark .4s linear infinite alternate;animation-delay:.1s}
  .dot-flashing-dark::before,.dot-flashing-dark::after{content:"";position:absolute;top:0;width:.375rem;height:.375rem;border-radius:9999px;background:#0d0d0d}
  .dot-flashing-dark::before{left:-.5rem;animation:dotFlashing-dark .4s infinite alternate;animation-delay:0s}
  .dot-flashing-dark::after{left:.5rem;animation:dotFlashing-dark .4s infinite alternate;animation-delay:.4s}
  @keyframes dotFlashing-dark{0%{background-color:#0d0d0d}50%,to{background-color:#00000080}}
  ```
- Dictation dots: 4 px, rising 4 px, 1.05 s ease-in-out, staggered 0, .16 and .32 s.
- The status line pattern is "<doing what> from your <thing>" followed by the dots.

### 2.4 Linear (seen on its home page)

- An agent "Thinking…" line, 13/20 at `#62666D` [css]. That grey is cool, so do not copy the colour; only the plainness is useful.

### 2.5 What we already have from libraries.dev

These live in `~/claudecode/job-portal/reference/libraries-dev/`, all MIT by Jakub Antalik. The agent docs are `thinking-orbs.md`, `border-beam.md`, `voice-glow.md` and `bot-avatars.md`, with rules in `FOR-ZERO.md`.

- **ThinkingOrb** (`thinking-orbs` 0.3.2): a canvas orb, sizes 20 and 64. It has nine states that name an activity (searching, weaving, composing, solving, connecting, shaping, listening, breathing, working). Pass `theme="light"`. It is a package, React only, with a shared rAF. That makes it awkward in the PiP window, where our `Loader` is CSS only on purpose. It is abstract, not a face, but it does not carry real data.
- **BorderBeam** (`border-beam` 1.4.1): a light running round the border of the element doing the work.
  - Variants are `line` (right after submit), `md` (while it works), `pulse-inner` and `pulse-outside`.
  - Use `mono` for us. Only for waits over 3 s, switched by the real flag.
- **VoiceBeam** (`voice-glow` 0.3.0): the mic glow rises with the voice, and `processing` shows while the reply is worked out. Voice only.
- **Bot avatars:** these are faces. Excluded by his note.

### 2.6 Ranking for a calm white product

The four manager moments, mapped to patterns:

| Rank | Pattern | Use it for | Why |
| --- | --- | --- | --- |
| 1 | **Steps trace** (C, which is our `LoadSteps`) | She **prepares a stage**; she **checks your notes** | Real steps in order, each with a real number and its true time. A finished step stays. Example: "Reading your file · 1,204 rows", then "Checking 10 notes against the brief", then "Writing stage 2". It is calm, honest and readable at a glance, and it never loops. |
| 2 | **One line pixel loader** (A, our `Loader`) | She **reads your file** (one operation, 2 to 8 s) | One label, one detail ("1,204 rows"), and time running. When there are no sub-steps this is the honest form. |
| 3 | **StreamText blur tail** (E) | She **thinks about your answer**, from the first word on | Before the first token, use the one line loader with "Reading your answer". After that, the words themselves are the progress. It matches his "blur to sharp" rule. |
| 4 | **TaskRows** (D) | Several things that each finish on their own, over 8 s, for example checking 5 deliverables | A number in the ring and a result pill per row. Heavier, so use it only when there are real separate jobs. |
| 5 | **Skeleton** (I) | A known shape about to fill (the stage card) | No words, so pair it with a line from rank 2. |
| 6 | **BorderBeam, mono** | The one card doing a wait over 3 s | Optional, secondary to a line that names the work. |
| 7 | Voicenotes status line with dots (2.3) | Fallback when no number exists | Readable, but the dots loop with no information. |
| Out | Spinner ring alone, records pulse, ThinkingOrb as the only signal, any face | | A ring or a pulse says only "busy". The orb is a mood, not data. Faces are banned for loading. |

Rules to hold:
1. The text and numbers come from the real data. If the real operation reports nothing, the line says what is being done and how long it has taken, and no more.
2. Steps appear only when they really start. Never pre-list future steps as fake progress.
3. One loader per view, in the place the result will land.
4. Nothing for under 2 s. Show the loader only after 2 s, so a fast answer never flashes.
5. Reduced motion freezes the grid and the sheen, and the timer keeps ticking.

---

## Part 3. Three token sets

How these work:
- They use the same names as `flow/ds/zero-jobs.css` (`--zj-*`), `flow/ds/tokens.css` (`--z4-*`) and `flow/theme.css` (`--z-*`).
- They are written for the lead's switch in `flow/ds/presets.css`: `<html data-zstyle="voice|job|trust">`.
- The dark (stage) version sits under `.zd` for the kit and on the root for `--z-*`, because `theme.css` is dark by default and `.z-light` is its light switch.

What stays the same in all three, on purpose:
- The meaning colours (`--zj-good`, `--zj-warn`, `--zj-due`, `--zj-lime`, `--zj-live`, `--zj-unread`, `--zj-like`, `--zj-select`, `--zj-fit-*`, `--zj-pop-*`, and `--z-green`, `--z-amber`, `--z-red`). Green means verified only; Voicenotes' Done green reads at 2.63:1, against 5.30:1 for ours.
- The motion tokens (`--zj-e`, `--zj-out`, `--zj-spring`, and the `--z4-spring`, `--z4-snap` and `--z-spring` curves). These are already approved, and the sources only differ by 30 to 40 ms.
- `--z4-bar` and the `--z-r-8/10/12/16` names. Those names state their own value, so changing `--z-r-8` to 6 would be a trap. Presets change only `--zj-r-*`.

"No shadow" is written as `0 0 #0000`, never `none`, because the kit chains shadow tokens in lists (`var(--zj-sh-sheet), …` and `…, var(--zj-sh-pop)`). `none` inside a list is invalid and drops the whole declaration.

### 3.1 `voice`: Voicenotes, super clean white

Decisions:
- One white ground. The sheet melts into the canvas (no sheet shadow).
- Grey fills instead of outlines.
- A flat black pill key.
- Grey `#F1F1F1` pills as the second choice.
- Air 1.25.
- Column 618 when a screen has a single column (layout, not a token).

Contrast on white [computed]:

| Ink | Ratio |
| --- | --- |
| `#0D0D0D` | 19.4 |
| `#555555` | 7.5 |
| `#717171` | 4.9 (4.3 on the `#F1F1F1` fill, so use ink2 on fills) |
| `#9B9B9B` | 2.8 (non-essential only, like the kit's ink4 at 2.35) |

```css
/* voice: Voicenotes web app, measured 2 Nov 2026 (flow/research/voicenotes.md) */
:root[data-zstyle='voice'] {
  --zj-canvas: #ffffff;          /* [px] page ground */
  --zj-sheet: #ffffff;           /* no sheet: the page is the sheet */
  --zj-well: #f1f1f1;            /* [px] every fill */
  --zj-well2: #eeeeee;           /* [src] greyEE */
  --zj-line: #eeeeee;            /* [est] note divider, reads #F3F3F3 blended */
  --zj-line2: #e3e3e3;           /* [px] dock edge */
  --zj-ink: #0d0d0d;             /* [src] dark */
  --zj-ink2: #555555;            /* [px] body, darkest pixel */
  --zj-ink3: #717171;            /* [src] grey71, meta */
  --zj-ink4: #9b9b9b;            /* [src] grey9B */
  --zj-key-bg: #0d0d0d;          /* [px][css] flat, no gradient */
  --zj-key-edge: #0d0d0d;
  --zj-sec-bg: #f1f1f1;          /* [px] grey pill, no outline */
  --zj-sec-bg-hover: #e9e9e9;    /* [est] greyEB without its blue */
  --zj-font: 'Inter', -apple-system, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif;
  --zj-display: 'Inter', -apple-system, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif;
  --zj-r-pill: 99px;
  --zj-r-sheet: 24px;            /* [px] dialog 22 to 24 */
  --zj-r-card: 16px;             /* [px][css] invite card, rounded-2xl */
  --zj-r-dialog: 24px;           /* [px] */
  --zj-r-row: 12px;              /* [px] settings group 12 to 14 */
  --zj-r-tile: 12px;
  --zj-r-ctl: 12px;              /* [px][css] invite 10 to 12, login 14 */
  --zj-r-sm: 8px;
  --zj-r-check: 6px;
  --zj-r-img: 5px;
  --zj-sh-sheet: 0 0 #0000;
  --zj-sh-hair: inset 0 0 0 1px var(--zj-line);
  --zj-sh-ring: 0 0 0 1px var(--zj-line2);
  --zj-sh-ctl: inset 0 0 0 1px var(--zj-line2);
  --zj-sh-key: 0 0 #0000;
  --zj-sh-key-down: 0 0 #0000;
  --zj-sh-sec: 0 0 #0000;
  --zj-sh-on: 0 0 0 1px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.08);             /* [css] */
  --zj-sh-panel: inset 0 0 0 1px var(--zj-line), 0 2px 5px rgba(0, 0, 0, 0.05), 0 8px 40px rgba(0, 0, 0, 0.04); /* [css] */
  --zj-sh-pop: 0 0 0 1px rgba(0, 0, 0, 0.04), 0 4px 24px rgba(0, 0, 0, 0.07);           /* [src] mind map tip */
  --zj-sh-toast: 0 0 0 1px rgba(0, 0, 0, 0.04), 0 4px 24px rgba(0, 0, 0, 0.07);
  --zj-sh-dialog: 0 24px 60px -12px rgba(0, 0, 0, 0.25);                                /* [css] */
  --zj-sh-float: 0 0 0 1px rgba(0, 0, 0, 0.05), 0 4px 16px rgba(0, 0, 0, 0.08);         /* [est] the dock plate */
  --z4-tint: #f1f1f1;
  --z4-tint2: #eeeeee;
  --z4-frame: #ffffff;
  --z4-sky: var(--z4-frame);
  --z4-air: 1.25;                /* [est] card pad 20 vs 16, rows 45 vs 36 */
  --z4-blue: #007aff;            /* [src] blueFF, the one Deep think chip */
  --z4-blue-tx: #016fd0;         /* [src] */
  /* the stage, dark (theme.css root) */
  --z-bg: #1b1b1b;               /* [src] darkTheme, neutralised */
  --z-panel: #222222;            /* [src] dark22 */
  --z-raise: #272727;            /* [src] darkTheme2, neutralised */
  --z-raise-2: #323232;          /* [src] #323334, neutralised */
  --z-line: rgba(255, 255, 255, 0.08);
  --z-line-2: rgba(255, 255, 255, 0.14);
  --z-tx: #eeeeee;               /* [src] greyEE */
  --z-tx-2: #b3b3b3;             /* [est] */
  --z-tx-3: #8d8d8d;             /* [src] grey8D */
  --z-key: #ffffff;
  --z-key-tx: #0d0d0d;
  --z-paper: #ffffff;
  --z-ink: #0d0d0d;
}
:root[data-zstyle='voice'] .zd {
  --zj-canvas: #1b1b1b;
  --zj-sheet: #1b1b1b;
  --zj-well: #272727;
  --zj-well2: #323232;
  --zj-line: rgba(255, 255, 255, 0.08);
  --zj-line2: rgba(255, 255, 255, 0.14);
  --zj-ink: #eeeeee;
  --zj-ink2: #b3b3b3;
  --zj-ink3: #8d8d8d;
  --zj-ink4: #717171;
  --z4-tint: #272727;
  --z4-tint2: #323232;
  --z4-blue: #eeeeee;
  --z4-blue-tx: #eeeeee;
}
:root[data-zstyle='voice'] .z-light {
  --z-bg: #ffffff;
  --z-panel: #ffffff;
  --z-raise: #f1f1f1;
  --z-raise-2: #eeeeee;
  --z-line: #eeeeee;
  --z-line-2: #e3e3e3;
  --z-tx: #0d0d0d;
  --z-tx-2: #555555;
  --z-tx-3: #717171;
  --z-key: #0d0d0d;
  --z-key-tx: #ffffff;
}
/* key and second choice: pills, Medium, flat */
:root[data-zstyle='voice'] .zj-key,
:root[data-zstyle='voice'] .zj-sec { border-radius: var(--zj-r-pill); padding: 0 20px; font-weight: 500; }
:root[data-zstyle='voice'] .zj-key:hover { filter: none; background: #191919; } /* [src] hover:bg-zinc-900 #18181B, neutralised */
:root[data-zstyle='voice'] .zd .zj-key { background: #ffffff; color: #0d0d0d; box-shadow: 0 0 #0000; }
:root[data-zstyle='voice'] .zd .zj-sec { background: var(--zj-well); box-shadow: 0 0 #0000; }
```

- Contrast on the `#1B1B1B` dark ground [computed]: `#EEEEEE` 14.9, `#B3B3B3` 8.2, `#8D8D8D` 5.2 and `#717171` 3.5.
- The voice dark is a slightly lighter charcoal than job. Voicenotes ships `#1B1C1C` as its dark ground.

**Voice key spec:**
- Rest: flat `#0D0D0D`, 36 high, padding 0 20, a pill, 14/20 white Medium [css, "Start for free"].
- The main action of a screen can take the **dock** form [px]: a 56 high key, 328 wide, in a 348 x 76 white plate with 10 padding and `--zj-sh-float`, at radius 28, label 16 Medium, fixed bottom centre, 22 above the bottom edge.
- Hover: `#191919`. Press: translateY(1px), which is the kit's.

**Font:**
- Inter, which is Voicenotes' own app font.
- **SIL OFL 1.1** [src, rsms/inter LICENSE.txt]. It is already self-hosted at `flow/ds/fonts/inter-latin-*.woff2`.
- Voicenotes ships Inter as three static families. We keep the variable file at 400 and 500.

**Radius scale:** pill 99, sheet 24, dialog 24, card 16, row 12, tile 12, ctl 12, sm 8, check 6, img 5.

**Air:** 1.25.

### 3.2 `job`: the job portal kit, as measured

The kit is copied from the portal v82 and is the default `:root` already. `presets.css` needs only `--z4-air: 1`. The block is listed in full here so the three sets can be compared.

```css
:root[data-zstyle='job'] {
  --zj-canvas: #f3f3f5;
  --zj-sheet: #ffffff;
  --zj-well: #f6f6f8;
  --zj-well2: #ededf0;
  --zj-line: #e7e7eb;
  --zj-line2: #d4d5da;
  --zj-ink: #131417;
  --zj-ink2: #4e525c;
  --zj-ink3: #6a6f7a;
  --zj-ink4: #a6a9b2;
  --zj-key-bg: linear-gradient(#313337, #17181b);
  --zj-key-edge: #0f1012;
  --zj-sec-bg: linear-gradient(#ffffff, #f3f4f6);
  --zj-sec-bg-hover: linear-gradient(#ffffff, #eeeff2);
  --zj-font: 'Inter', -apple-system, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif;
  --zj-display: 'Inter', -apple-system, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif;
  --zj-r-pill: 99px; --zj-r-sheet: 28px; --zj-r-card: 20px; --zj-r-dialog: 16px; --zj-r-row: 14px;
  --zj-r-tile: 13px; --zj-r-ctl: 10px; --zj-r-sm: 8px; --zj-r-check: 6px; --zj-r-img: 5px;
  --zj-sh-sheet: 0 0 0 1px rgba(19,20,23,.05), 0 1px 2px rgba(19,20,23,.04), 0 40px 70px -50px rgba(19,20,23,.35);
  --zj-sh-key: inset 0 1px 0 rgba(255,255,255,.16), inset 0 -2px 0 rgba(0,0,0,.45), 0 0 0 1px var(--zj-key-edge), 0 12px 22px -14px rgba(19,20,23,.6);
  --zj-sh-key-down: inset 0 1px 0 rgba(255,255,255,.1), 0 0 0 1px var(--zj-key-edge);
  --zj-sh-sec: inset 0 0 0 1px rgba(19,20,23,.14), inset 0 -2px 0 rgba(19,20,23,.05), 0 1px 2px rgba(19,20,23,.07);
  /* hair, ring, ctl, on, panel, pop, toast, dialog, float: as zero-jobs.css lines 60 to 72 */
  --z4-tint: #f6f6f6; --z4-tint2: #ececec; --z4-frame: #ffffff; --z4-sky: var(--z4-frame); --z4-air: 1;
  --z4-blue: #3e7bf5; --z4-blue-tx: #2851c8;
}
/* dark: the current .zd in tokens.css (#141414, #1b1b1b, #242424, #2e2e2e, lines 8% and 14%, inks #f4f4f4, #adadad, #7a7a7a, #5c5c5c), and theme.css :root. Already neutral. */
```

**Which greys read blue** (blue minus red) [src]:

| Token | Kit | Blue minus red | Neutral, same luminance [computed] |
| --- | --- | --- | --- |
| canvas | `#F3F3F5` | +2 | `#F3F3F3` |
| well | `#F6F6F8` | +2 | `#F6F6F6` |
| well2 | `#EDEDF0` | +3 | `#EDEDED` |
| line | `#E7E7EB` | +4 | `#E7E7E7` |
| line2 | `#D4D5DA` | +6 | `#D5D5D5` |
| ink | `#131417` | +4 | `#141414` |
| **ink2** | `#4E525C` | **+14** | `#525252` |
| **ink3** | `#6A6F7A` | **+16** | `#6F6F6F` |
| **ink4** | `#A6A9B2` | **+12** | `#A9A9A9` |
| sec-bg end | `#F3F4F6` | +3 | `#F4F4F4` |
| sec hover end | `#EEEFF2` | +4 | `#EFEFEF` |
| shadows | `rgba(19,20,23,…)` | +4 | `rgba(20,20,20,…)` |

- The portal uses these values itself. `~/claudecode/zero-jobs-design-system/v1/DESIGN.md` section 4 lists the same numbers. Its opening line says "a cool grey canvas with a white sheet".
- So, by the brief's rule, the `job` preset keeps them.
- The grounds are barely cool (+2 to +6). The **text** carries the visible blue (+12 to +16).
- This conflicts with `BRIEF-b4.md` ("No bluish grey anywhere") and with his own memory of the portal as "white, not some bluish greys".
- The neutral column above is the drop-in if he wants the portal look without the cool cast. Same luminance means the contrast does not change. That decision is his, not mine.

**Key:** the machined black key, 36 high, padding 0 14, radius 10, 14 white at 400 (500 in a card foot), with the gradient and bevel shadow above.

**Font:** Inter (OFL 1.1).

**Radius scale:** pill 99, sheet 28, card 20, dialog 16, row 14, tile 13, ctl 10, sm 8, check 6, img 5.

**Air:** 1.

**Dark:** the current `.zd`.

### 3.3 `trust`: cleaner, premium, intelligent, trustworthy

**Sources chosen, and why:**

1. **Vercel Geist, for the greys, key, shadows and spacing.**
   - Read live: the `vercel.com/geist/button` page with the light theme forced. Computed `--ds-gray-*` values are in `trust-geist.json`, and the screenshot is `shots/trust-geist/geist-light.png`.
   - Its whole grey scale is **HSL 0, 0%**: literally zero tint. Examples: `--ds-gray-100-value: 0, 0%, 95%` and `--ds-gray-1000-value: 0, 0%, 9%` [css].
   - Elevation is alpha black only, at 2% to 8%.
   - The key is a flat near-black slab.
   - It is the plainest "serious tool" look on the web, and it fits his slab-and-hairline control style.
2. **Linear, for the light surface ladder and its quiet elevation.**
   - Read live on `linear.app`: `[data-theme="light"]` tokens in `trust-linear.json`.
   - The level ladder is neutral: `#FFFFFF`, `#F8F8F8`, `#F4F4F4` and `#F0F0F0` [css].
   - Shadows are 9% black: `0px 1px 1px #00000017` and `0px 3px 12px #00000017` [css].
   - It is built on Inter, like ours.
   - I did **not** take its text inks: `#282A30` and `#3C4149` are cool [css].

**Rejected, all measured live:**

| Product | Measured | Why it is out |
| --- | --- | --- |
| Mercury | `#EDEDF3` ink, `rgba(175,178,206,.2)` ghost buttons, `#272735` cards, key `#5266EB` [css] | Blue tint everywhere; Arcadia is proprietary |
| Stripe | ink `#061B31`, body `#64748D`, accent `#533AFD` [css] | Slate blue; Söhne is proprietary |
| Anthropic | ground `#FAF9F5`, greys `#F5F4ED` to `#141413` [css] | Warm beige, which he banned |
| Notion | (not read) | Warm ink, `#37352F`, known; skipped for warmth |

**Decisions:**
- A faint canvas `#FAFAFA` (Geist `background-200`) with white sheets.
- A thin 8% ring instead of grey fills.
- A flat `#171717` key at radius 8.
- Smaller radii (premium tools read sharper).
- Air 1.15.

Contrast on white [computed]:

| Ink | Ratio |
| --- | --- |
| `#171717` | 17.9 |
| `#4D4D4D` | 8.5 |
| `#666666` | 5.7 (5.1 on the `#F2F2F2` well) |
| `#8F8F8F` | 3.2 (non-essential only) |

Geist's own tertiary `#7D7D7D` is only 4.1, so I used Geist's legacy `accents-5 #666` [css] for ink3.

```css
/* trust: Vercel Geist greys and key, Linear surfaces and elevation, Inter. Measured 2 Nov 2026 (flow/research/voicenotes.md) */
:root[data-zstyle='trust'] {
  --zj-canvas: #fafafa;          /* [css] Geist background-200 */
  --zj-sheet: #ffffff;           /* [css] Geist background-100 */
  --zj-well: #f2f2f2;            /* [css] Geist gray-100 (its loading button fill) */
  --zj-well2: #ebebeb;           /* [css] Geist gray-200 */
  --zj-line: #ebebeb;            /* [css] Geist 8% black hairline on white */
  --zj-line2: #dcdcdc;           /* [css] Linear border-tertiary #DCDBDD, tint removed */
  --zj-ink: #171717;             /* [css] Geist gray-1000 */
  --zj-ink2: #4d4d4d;            /* [css] Geist gray-900 */
  --zj-ink3: #666666;            /* [css] Geist accents-5, AA at 12 px */
  --zj-ink4: #8f8f8f;            /* [css] Geist gray-700 */
  --zj-key-bg: #171717;          /* [css] Geist primary button */
  --zj-key-edge: #171717;
  --zj-sec-bg: #ffffff;          /* [css] Geist secondary button */
  --zj-sec-bg-hover: #fafafa;    /* [est] */
  --zj-font: 'Inter', -apple-system, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif;
  --zj-display: 'Inter', -apple-system, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif;
  --zj-r-pill: 99px;
  --zj-r-sheet: 16px;            /* [css] Linear --radius-16 (role est) */
  --zj-r-card: 12px;             /* [css] Linear --radius-12 (role est) */
  --zj-r-dialog: 12px;
  --zj-r-row: 8px;               /* [css] Linear site bubbles and chips 8 */
  --zj-r-tile: 10px;
  --zj-r-ctl: 8px;               /* [css] Geist 40 high button 8; 6 at 32 and 36 */
  --zj-r-sm: 6px;                /* [css] Geist 32 and 36 high button */
  --zj-r-check: 4px;
  --zj-r-img: 4px;
  --zj-sh-sheet: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 2px 2px rgba(0, 0, 0, 0.04), 0 8px 16px -4px rgba(0, 0, 0, 0.04); /* [css] Geist shadow-border-large */
  --zj-sh-hair: inset 0 0 0 1px var(--zj-line);
  --zj-sh-ring: 0 0 0 1px var(--zj-line2);
  --zj-sh-ctl: inset 0 0 0 1px var(--zj-line2);
  --zj-sh-key: 0 0 #0000;        /* [css] Geist key is flat */
  --zj-sh-key-down: 0 0 #0000;
  --zj-sh-sec: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 2px 2px rgba(0, 0, 0, 0.04);              /* [css] Geist shadow-border-small */
  --zj-sh-on: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);               /* [css] Geist border + xs */
  --zj-sh-panel: inset 0 0 0 1px var(--zj-line), 0 2px 2px rgba(0, 0, 0, 0.04), 0 8px 8px -8px rgba(0, 0, 0, 0.04); /* [css] Geist medium */
  --zj-sh-pop: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 1px 1px rgba(0, 0, 0, 0.02), 0 4px 8px -4px rgba(0, 0, 0, 0.04), 0 16px 24px -8px rgba(0, 0, 0, 0.06); /* [css] Geist xl */
  --zj-sh-toast: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 1px 1px rgba(0, 0, 0, 0.02), 0 4px 8px rgba(0, 0, 0, 0.04); /* [css] Geist tooltip */
  --zj-sh-dialog: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 32px 72px -12px rgba(0, 0, 0, 0.06), 0 8px 32px -12px rgba(0, 0, 0, 0.08), 0 8px 24px -12px rgba(0, 0, 0, 0.12); /* [css] Geist modal-elevated */
  --zj-sh-float: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 3px 12px rgba(0, 0, 0, 0.09);          /* [css] Linear shadow-medium */
  --z4-tint: #f2f2f2;
  --z4-tint2: #ebebeb;
  --z4-frame: #fafafa;
  --z4-sky: var(--z4-frame);
  --z4-air: 1.15;                /* [est] no source gives a multiplier; see below */
  --z4-blue: #0070f7;            /* [css] Geist blue-700 */
  --z4-blue-tx: #005edc;         /* [css] Geist blue-800 */
  /* the stage, dark (theme.css root). Geist dark, measured on vercel.com */
  --z-bg: #0a0a0a;               /* [css] */
  --z-panel: #111111;            /* [est] */
  --z-raise: #1a1a1a;            /* [est] */
  --z-raise-2: #1f1f1f;          /* [css] Geist dark border */
  --z-line: #1f1f1f;             /* [css] */
  --z-line-2: #2e2e2e;           /* [css] Geist dark button ring */
  --z-tx: #ededed;               /* [css] */
  --z-tx-2: #a1a1a1;             /* [css] */
  --z-tx-3: #878787;             /* [est] AA on #111 */
  --z-key: #ededed;              /* [css] Geist dark primary */
  --z-key-tx: #0a0a0a;           /* [css] */
  --z-paper: #fafafa;
  --z-ink: #171717;
}
:root[data-zstyle='trust'] .zd {
  --zj-canvas: #0a0a0a;
  --zj-sheet: #111111;
  --zj-well: #1a1a1a;
  --zj-well2: #1f1f1f;
  --zj-line: #1f1f1f;
  --zj-line2: #2e2e2e;
  --zj-ink: #ededed;
  --zj-ink2: #a1a1a1;
  --zj-ink3: #878787;
  --zj-ink4: #5e5e5e;
  --z4-tint: #1a1a1a;
  --z4-tint2: #1f1f1f;
  --z4-blue: #ededed;
  --z4-blue-tx: #ededed;
}
:root[data-zstyle='trust'] .z-light {
  --z-bg: #fafafa;
  --z-panel: #ffffff;
  --z-raise: #f2f2f2;
  --z-raise-2: #ebebeb;
  --z-line: #ebebeb;
  --z-line-2: #dcdcdc;
  --z-tx: #171717;
  --z-tx-2: #4d4d4d;
  --z-tx-3: #666666;
  --z-key: #171717;
  --z-key-tx: #ffffff;
}
:root[data-zstyle='trust'] .zj-key { font-weight: 500; padding: 0 12px; }
:root[data-zstyle='trust'] .zj-key:hover { filter: none; background: #383838; }  /* [est] Geist hover, not captured */
:root[data-zstyle='trust'] .zd .zj-key { background: #ededed; color: #0a0a0a; box-shadow: 0 0 #0000; }
:root[data-zstyle='trust'] .zd .zj-sec { background: var(--zj-sheet); color: var(--zj-ink); box-shadow: 0 0 0 1px #2e2e2e; } /* [css] Geist dark secondary */
```

**Trust key spec** [css, Geist button page]:
- 36 high, padding 0 10, radius 6, 14/500, flat `#171717`, white text. At 40 high: padding 0 14, radius 8, 16/500.
- Its transition is `0.15s cubic-bezier(0.4,0,0.2,1)`.
- The preset keeps the kit's 36 high key. It uses radius 8 (one value for every control from 34 to 40 high) and padding 0 12. Those two are my calls, between Geist's 6 and 8.
- The second choice is a white slab with an 8% ring and a 4% drop.

**Font:**
- Inter (OFL 1.1, already self-hosted), so the b4 "Inter only" rule holds.
- Optional, if he wants trust to carry its source's voice: **Geist**.
  - **SIL OFL 1.1**: `Copyright (c) 2023 Vercel, in collaboration with basement.studio` [src, vercel/geist-font `LICENSE.txt`]. npm `geist` 1.9.0 reports "SIL OPEN FONT LICENSE".
  - Self-host the variable woff2 from that package.
  - Stack: `'Geist', 'Inter', -apple-system, system-ui, sans-serif`.
  - Geist turns off `calt` and uses `ss11` on vercel.com [css].
  - This breaks the b4 Inter rule, so it is his call.
  - Linear uses Inter at weight 510 with `cv01`, `ss03` [css]. We stay at 400 and 500 with `cv11`, `ss01`.

**Radius scale:** pill 99, sheet 16, card 12, dialog 12, row 8, tile 10, ctl 8, sm 6, check 4, img 4.

**Air:** 1.15 [est].
- Geist spaces on a 4 px grid (4, 8, 12, 16, 24, 32, 40, 64, 96) and uses a 24 gap [css].
- At 1.15, the kit's 28, 24 and 16 become 32, 28 and 18, which land on or near that grid.
- It is more open than the portal, less open than voice.

**Dark** [css: page `#000`, surfaces `#0A0A0A`, borders `#1F1F1F`, button ring `#2E2E2E`, text `#EDEDED` and `#A1A1A1`]:
- Geist's dark is near black, not charcoal. The trust stage is therefore deeper and sterner than the job stage (`#141414`).
- If he wants the trust stage in charcoal, use the job `.zd` values. The greys are identical in spirit.

### 3.4 The three side by side

| | voice | job | trust |
| --- | --- | --- | --- |
| Ground | `#FFFFFF`, no sheet | `#F3F3F5` canvas, white sheet | `#FAFAFA` canvas, white sheet |
| Separation | grey fills `#F1F1F1` | hairlines and a long sheet shadow | 8% rings and 4% drops |
| Ink ladder | `#0D0D0D` `#555555` `#717171` `#9B9B9B` | `#131417` `#4E525C` `#6A6F7A` `#A6A9B2` (cool) | `#171717` `#4D4D4D` `#666666` `#8F8F8F` |
| Key | flat black pill, Medium; dock form 56 high | machined gradient, radius 10 | flat `#171717` slab, radius 8, Medium |
| Second choice | grey pill, no outline | white gradient, ring and bevel | white slab, 8% ring |
| Radii | 24 / 16 / 12 / 12 | 28 / 20 / 14 / 10 | 16 / 12 / 8 / 8 |
| Air | 1.25 | 1 | 1.15 |
| Stage dark | `#1B1B1B` charcoal | `#141414` charcoal | `#0A0A0A` near black |
| Font | Inter | Inter | Inter (Geist optional) |

The radii row reads sheet / card / row / ctl.

All three have neutral greys only (R = G = B), except the job kit's measured cool greys, which are flagged in 3.2. None has a radial glow or a warm beige.
