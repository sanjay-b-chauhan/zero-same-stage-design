Parts read `useFlow` themselves. Each is safe inside the PiP document. `surface` is `'big' | 'pip'`. CSS: `flow/stage/stage.css`, class prefix `zs2-`, needs a `.zs2` ancestor for its local tokens.

- `Thread({ surface })`: messages, typing, options, file chips, film, voice notes. Fills its parent, scrolls itself. Pip opens on the latest exchange.
- `Composer({ surface })`: input, attach, hold mic, send. Turns into the live mic slab while holding. Draft survives a switch.
- `SlotBoard({ surface, submit? })`: the steps as numbered sections (chevron, number, title, count), each folding on the spring. `submit` is what the last section, Submission, holds; the big screen passes its `SubmitArea`. Without a submit step it sits under the sections with no heading.
- `Grip` and `useColumns(body, kind, flip)`: the seam between the work and the chat drags, the width is kept in localStorage.
- `FileCard({ file, surface })`: big screen, a sheet or a picture is a preview card; her tool link is an inline blue link. PiP keeps the compact row.
- `SubmitArea({ surface, part })`: `part` is `'all' | 'key' | 'drop'`. Key is the action key for every phase. Drop is the drag, upload, paste area, shows while `stage.submitOpen`. Pip: key in the action area, drop in the body.
- `FeedbackList({ surface })`: the checklist, list only. The resubmit key lives in `SubmitArea part="key"`.
- `ResourcesList({ surface, onClose? })` and `Preview({ surface, onClose? })`: full height, own header. Preview reads `ui.previewFileId`. Without `onClose` they call `actions.closeSide`.
- `FilmPlayer({ surface, filmId })`, `Timer({ surface })`, `Face({ size, live? })`, `Dashes({ thin?, onTap? })`.
- `PouLines()`: What, Why, How, One more rows. `PouExchange({ surface })`: big is the meter, thread and hold pill. Pip is her current question and a 52 high hold slab.
- `useHold(hostRef)` from `useHold.ts`: call once per document with a ref to any element inside it. Binds Space and Option+Space there, runs recognition in the parent. `holdProps()` spreads onto any hold button.
