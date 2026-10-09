# XWflow

XWflow is a workflow orchestration front end. An organization defines a process, publishes a version of that process, and runs the published version. Every run keeps a record from start to finish.

The interface is built only with [XWUI](https://xwui.dev) basic components, loaded from the CDN. There is no React, Next.js, or other UI library. Sample data lives in a local dummy API. Pages never embed that data themselves.

## Setup

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4173

`npm run typecheck` checks TypeScript. `npm run build` produces `dist/`. `npm run preview` serves that build.

The only packages installed are the TypeScript compiler and Vite, and they are dev tooling. The browser loads XWUI from `https://xwui.dev/esm/basic.bundle.js`.

## What you can do

- Overview shows how many processes are published and how many runs are active or failed.
- Processes can be searched, created, and opened.
- A process draft is a sequence of steps. Add, edit, and remove steps, then publish a version with a note.
- A run always copies the latest published version. Later draft edits do not change that record.
- Runs can be filtered. Open a run to see each step from start to finish. A live run advances on its own.
- The assistant answers from the process and its runs. The question stays on this machine.

The workspace is remembered in `sessionStorage` for the browser session. Clear site data to restore the sample workspace.

## Architecture

The shape follows the separation used in logistics-v2 (thin routes, pages, a single API boundary, shared types, and a content catalog), without that project's React stack.

| Piece | Role |
| --- | --- |
| `src/app/router.ts` | Hash routes and query filters. List filters live in the URL. |
| `src/pages/` | Screens. They render XWUI and call `src/api/client.ts` only. |
| `src/api/dummy-api.js` | Sample data, validation, and simulated latency. |
| `src/api/client.ts` | Typed access to that file. |
| `src/content/catalog.ts` | Navigation and every visible string. |
| `src/config.ts` | Locale, theme, polling, and search debounce. |
| `src/components/XWFlowCanvas` | Custom step flow. Extends `XWUIComponent`, split into data, logic, view, and CSS. |
| `src/components/XWFlowAssistant` | Custom assistant. Same split. Asks through the dummy API. |

## Assumptions

- The prototype at the assessment link returned "Page not found" from this environment, including a signed-in browser. The screens follow the written brief: define a process, publish a version, run it, and keep the record.
- Publishing freezes a copy of the draft. The next run uses the highest version number.
- A new run walks its steps on a timer inside the dummy API (about one second per step). Seeded historical runs stay as they were recorded.
- There is no sign-in. The actor and organization come from the dummy workspace.
- XWUI basic is the only component set. The process diagram is a custom component because the workflow canvas is not in the basic tier.

## Incomplete

- Pixel match to the private prototype, until that link loads.
- No real backend, permissions, or credentials.
- Step graphs are a single sequence. Branches are shown as a decision step, not as separate paths.
