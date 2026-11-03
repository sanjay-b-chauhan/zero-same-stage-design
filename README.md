# Zero, same stage design

The scripted prototype of one Zero project, start to finish, in the real product's look. You land on the world map, pick a company, meet your manager in the kickoff, read the plan, then work stage one with her in chat until she signs it off.

**Live:** https://zero-same-stage-design.vercel.app (current build, b32)
**Every build:** https://zero-same-stage-design.vercel.app/versions/ and [VERSIONS.md](VERSIONS.md)

Everything is faked on purpose. No mic, no screen share, no backend, no AI calls. Her lines are recorded takes, her replies are scripted, and checks like "private link" are part of the script.

## What is in here

| Folder | What it is |
|---|---|
| `live-b32/` | The built site, exactly what the live link serves. Open it with any static server. |
| `source/flow/` | All the prototype code. One folder per part of the experience (see the map below). |
| `source/static/` | Faces, logos, voice takes, films, the raw CSV, title art. Copied into every build as is. |
| `source/_libs/` | Three small effect libraries, vendored (thinking orbs, voice glow, border beam). |
| `source/tools/` | Scripts that made the kickoff script and the voice takes. |
| `source/capture/` | The headless test runner used to check every build (muted Chrome, scripted clicks, screenshots). |
| `VERSIONS.md` | Every build with what changed and its own link. |
| `BUILD-LOG.md` | The working notes: each round, the review note it answers, and the decisions behind it. |

## Run the built site

```bash
cd live-b32
python3 -m http.server 8080
```

Then open http://localhost:8080. Press Control+D for the dev panel: every moment in the flow is listed there, and the arrow keys step through them. A link can land on any moment with `?step=<id>` (for example `?step=stage`), and `?ask=on` or `?ask=off` picks the stage mode.

## Build from source

The prototype lives inside the Zero desktop app repo (zero-core-ui) at `standalone/`, because it mounts a few real product components through the `@/` alias (the Level and Coach panel, the objective view, a few stores and helpers). Those are not copied here. To build:

1. Put `source/` at `zero-core-ui/standalone/` in a checkout of zero-core-ui and run `npm install` at the repo root.
2. From `standalone/`:

```bash
VITE_D1=1 VITE_DS=2 Z_MIN=1 Z_OUT=dist-ds-b33 ../node_modules/.bin/vite build --config vite.config.ts
```

3. Serve `dist-ds-b33/`. The screenshot key uses html-to-image 1.11.11 (MIT), vendored at `flow/vendor/html-to-image/` with one marked patch in `clone-node.js` so scrolled boxes keep their scroll position. The dev server is `../node_modules/.bin/vite --config vite.config.ts` on port 5199.

## Map of `source/flow`

| Part | Folder |
|---|---|
| World map, company card, project brief | `open/` (the map's drag, glide and zoom is `open/pan.ts`) |
| Kickoff meeting, check-ins, notes | `room/`, `kickoff/` |
| Project overview and the stage list | `room/plan/` |
| The stage: chat, brief, hand in, feedback | `same/` (`StageSame.tsx`, `store.ts`, `script.ts`, `ds.css`) |
| Desktop bar and the fake desktop | `pip/` |
| Level, XP and coach in the top right | `hud/` |
| Dev panel and the step list | `dev/` |
| Build stamp | `FlowRoot.tsx` |

## How we made it

Each round started from a review note (screenshots and his words), changed only what the note named, and shipped as a new numbered build. Nothing was overwritten: every build is still live at `/bN/`. Each one was tested headless at 1512x800 and 2560x1300 before going out, and the live files were byte-checked against the build. The full trail is in [BUILD-LOG.md](BUILD-LOG.md).

This is Zero work. Keep the repo private.
