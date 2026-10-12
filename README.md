# xwflow

A working front end for the xwflow prototype (22 boards): define a process, publish a version, run it, and read a receipt of every step. The same flow can be drawn as a node graph, flowchart, swimlane, BPMN, sequence diagram, simulation or 3D scene, and the assistant turns a sentence into a draft. Nothing goes live until it is published.

- **UI:** XWUI basic components only, loaded from xwui.dev as published. The two components XWUI basic lacks (a 3D layer stack and the notation diagrams) are XWFlow components in `src/components`, built on the XWUI component base with its split of types, schema, logic, view and styles.
- **Data:** a local dummy API (`src/api/dummy-api.js`, sample data in `src/api/data/`) with asynchronous calls and simulated latency. Pages reach data only through it.
- **No hard coding:** words in `src/content`, colours, type and spacing as theme tokens (`public/theme/xwflow`), decorations as named presets. A test fails the build otherwise.
- **AI:** built with AI assistance (Claude Code) for implementation, review and headless browser checks; every change was verified before it was committed.

## Setup

Node.js 20 or newer, and a browser with internet access (XWUI loads from xwui.dev).

```bash
npm install
npm run dev     # http://127.0.0.1:4173
npm test        # 131 unit and component tests
npm run e2e     # browser tests: every journey, an axe scan of every route, phone width
npm run check   # typecheck, lint, coverage, build (CI runs this and e2e on every push)
npm run build   # typecheck, then dist/
```

Start at `#/` (website), `#/studio` (assistant), `#/studio/flows` (flows and editor) or `#/admin` (operator console). More: [docs/architecture.md](docs/architecture.md) for how it is built and checked, [docs/xwui-issues.md](docs/xwui-issues.md) for the problems found in the published XWUI bundle (behaviour and accessibility) and how each is worked around.

## Assumptions

- There is no sign-in. The current person is "You", in the Builder role, so Quotas opens the denied screen.
- The website header follows the prototype's Main board on every page. Docs opens the Self-host quickstart, because the prototype has no documentation site.
- The prototype has admin boards for Overview, Branding, Audit, Health and the denied state. The other rail items (Tenants, Credentials policy, Node registry, Adapters, Usage, AI governance, Schedules, Workers, All executions, Config) are designed here in the same style, and every change they make is written to the audit log.
- The notation pages are read-only views of a flow, as in the prototype; editing, running and publishing happen in the editor (the **Node graph** tab).
- Runs, the simulation and the health checks are simulated in the browser. The workspace is kept for the browser session; clearing site data restores the samples.
- The tenant is on the Core plan, so brand saving, audit streaming and uploads show the Commercial note. Prices and start commands stay placeholders, as in the prototype.
- Health draws 14 days because `XWUIUptimeBar` accepts at most 14.

## Incomplete

- No identity screens, billing or real execution; those belong to other tiers.
- The assistant matches the prompt to sample recipes; it does not call a live language model. An unrecognised prompt gets the order alert example.
- The Arabic interface: العربية says it comes in the next release; the app does not switch to Arabic or right to left yet.
- On Notations, List and Code are concepts; Export receipt copies the receipt as JSON rather than saving a file.
- The workarounds in [docs/xwui-issues.md](docs/xwui-issues.md) can go once xwui.dev fixes those components.
