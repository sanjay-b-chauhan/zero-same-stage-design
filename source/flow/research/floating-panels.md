**Limits first.** Mobbin carries web and iOS only. Raycast, Granola, ChatGPT desktop, Claude quick window, FaceTime, Arc and Notion Calendar gave nothing usable, so I measured what it has. "~" means read from a screenshot, assuming a 1440 wide capture. Nothing was run in a real PiP window.

**What decides the design:** Chrome grows a PiP only on a click. Her message can never open the window.

**A. Steal, ranked**
1. Cluely, pill plus fold-under panel: grey slab, hairline, panel opens below. No numbers, app is closed. A PiP cannot move, so this direction is forced.
2. [Loom bar](https://mobbin.com/screens/f43ae609-ba0f-472e-8263-2d977a937eef): ~290x48, target ~35, icon ~16, pitch ~34, ~26 tall divider between groups.
3. [Chatbase dashes](https://mobbin.com/screens/4ae71094-e7e4-4a5e-ae5b-6bd78b124015): ~26x4, gap ~6, fully round. Done white, pending dim solid.
4. [Dynamic Island](https://developer.apple.com/design/human-interface-guidelines/live-activities): compact 62.33x36.67 per side, expanded 408x84 to 160 (Apple's numbers). Expanded keeps relative placement, one interactive element, alerts only for essentials.
5. [Cofounder chip](https://mobbin.com/screens/535a675a-5307-457a-8d55-3f9f636d1ee4): ~275x43, radius ~9, button ~61x26. A count plus one action, never a popup. Morph it like Clicky: shapes stay mounted, spring .4 / .6.

**B. Anatomy** (assumes "big screen" means the full Zero tab; confirm)
- **Collapsed:** content 340x52, real window about 340x86 with Chrome's strip. 52 is Chrome's floor, so the 44 high bar law (b31) cannot exist here.
- **Opened:** 340x560. Same width, so the row never moves. Two heights only.
- **Row:** her face (this is chat, 24 in a 36 target), dashes filling the centre, resources, switch. Not four equal icons: dashes carry the information, so they take the middle. Buttons 36, icons 16, gap 4, padding 8.
- **Slots:** ~28x3, gap 4. Empty #2A2A2A, filled off-white, green only once verified. On fill, the dash wipes left to right; its name holds 2 s.
- **New message, closed:** centre becomes one 12px line, "Column F is off by one". Dashes thin to 2px beneath. After 6 s the dashes return and a 6px dot stays on her face. Click opens on that message.
- **Opened order:** row, body, 44 input. Hers plain 14, yours small 12 on the right. Resources swap the body.
- **Takeovers:** the centre zone announces, the click opens, the row stays. Priority: voice, feedback, submit, message.
  - Submit: solid off-white 32 high button. Body lists slots.
  - Feedback: "3 fixes". Body is the checklist, Resubmit unlocks below.
  - Voice: her first words. Body is face 48, circle following the take, one question, 52 high hold slab. Get mic permission in the big tab first.
- **Motion:** the resize snaps, so the body rises after it, spring and blur to sharp.

**C. Document PiP**

*Works:*
- Always on top, any HTML, one per tab. Chrome and Edge 116+, Firefox 151+ ([Chrome docs](https://developer.chrome.com/docs/web-platform/document-picture-in-picture)).
- Content floor 240x52, window max 80% of screen, site request max 25% of screen area ([Chromium source](https://github.com/chromium/chromium/blob/main/chrome/browser/picture_in_picture/picture_in_picture_window_manager.cc)). 340x560 fits even on 1280x720. Chrome's strip is 34 ([frame source](https://github.com/chromium/chromium/blob/main/chrome/browser/ui/views/frame/picture_in_picture_browser_frame_view.cc)).
- resizeTo (121+) needs a gesture and consumes it ([spec](https://wicg.github.io/document-picture-in-picture/)). Resize animation is off by default ([flags](https://github.com/chromium/chromium/blob/main/media/base/media_switches.cc)).
- Focus to opener (123+) needs a gesture and leaves the PiP open. disallowReturnToOpener (124+) hides Chrome's button, leaving our switch alone.
- Activation is shared with the opener (spec 6.12).
- Size and position are [remembered](https://developer.mozilla.org/docs/Web/API/DocumentPictureInPicture/requestWindow); sites cannot set position.

*Does not:* outlive the opener or survive its navigation, so the big screen must stay one page. No fullscreen. File dialogs tuck it on Mac and Windows.

*No rule found, test first:* file drop, keyboard, autoplay, mic inside PiP (its top bar has a mic icon, so likely). [Stream](https://getstream.io/video/docs/react/ui-cookbook/document-pip/) keeps audio in the parent. Only the opener can take focus back, so each PiP click probably costs Excel its focus. requestWindow consumes the click, so opening Excel on that same click may fail.

*Fallback:* Safari and older Firefox get the same DOM as an in-page dock, without always on top. If drop fails, an attach button.

**D. Avoid**
1. Loom: six controls plus a timer, and a thick ring. Sanjay banned that look.
2. [Vapi](https://mobbin.com/screens/175b0ca2-92d3-428a-bd3a-1cc4d68d998a): title, icon and three actions in a ~47 header. Under Chrome's 34 that is 81 of chrome. Add no title row.
3. Clicky: stuck "Thinking" and "Speaking" were real bugs. With one centre zone, a stuck state hides everything, so time out back to dashes.