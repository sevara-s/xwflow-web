# xwflow

A working front end for the xwflow prototype (22 boards). An organization defines a process, publishes a version, runs that version, and reads a receipt of every step from start to finish.

The same flow can be drawn as a node graph, a flowchart, a swimlane, BPMN, a sequence diagram, a simulation, or a 3D scene. The assistant turns a sentence into a draft. Nothing goes live until it is published.

The UI is built from XWUI basic components loaded from xwui.dev, as published. Components XWUI basic does not offer are XWFlow components in this repo, built on the XWUI component base. The xwflow theme and logo are also in this repo. All data comes from a local JavaScript dummy API.

The app was built with AI assistance (Claude Code) for implementation, review and headless browser checks, as the brief requires; every change was verified before it was committed.

## Requirements

- Node.js 20 or newer (developed on Node 26) and npm.
- A current Chrome, Edge, Firefox or Safari, online (XWUI loads from xwui.dev).

## Setup

```bash
npm install
npm run dev         # http://127.0.0.1:4173
npm test            # Vitest: 130 tests in 14 files
npm run typecheck   # tsc --noEmit
npm run build       # typecheck, then dist/
npm run preview     # serve dist/
```

The only npm packages are development tools: TypeScript, Vite, Vitest and happy-dom (a DOM for the component tests). There is no other component library and no CSS framework, and `npm audit` reports no vulnerabilities.

## How XWUI is used

- **Components:** `src/xwui.ts` imports the XWUI classes the app uses from `https://xwui.dev/esm/basic.bundle.js`. Pages describe the UI as XWUI composer nodes (`{ tag, data, config, slots }`) and one `XWUIComposer` mounts them.
- **Theme:** `index.html` links the generic XWUI style parts from `https://xwui.dev/styles/` (reset, typography, utilities, the modern style, pill roundness, lines, glow, icons) in the order XWUI composes its presets. The four xwflow parts in between come from this repo: `public/theme/xwflow/brand.css`, `colors.css`, `accent.css` and `typography.css`. `components.css` (loaded last) holds overrides of published components.
- **Logo:** `public/brand/xwflow-logo.svg`, named once in `src/config.ts` (`logoPath`) and also used as the favicon.
- Nothing in this repo is a modified copy of the XWUI library, and nothing swaps xwui.dev for a local build.

## XWFlow components

XWUI basic has no layer stack, and ships an earlier notation diagram than the prototype needs. These two are app components in `src/components`, named XWFlow so they are never mistaken for library components:

| Component | Used on | What it adds |
| --- | --- | --- |
| `XWFlowLayerStack` | `#/notations` hero | Three notations of one flow on glowing planes, stacked in 3D, with labels |
| `XWFlowNotationDiagram` | Flowchart, swimlane, BPMN, sequence and simulation views | Start and end terminators, retry loops, fixed columns and rows, the filled block notation with live counts for the simulation, sequence row selection, SVG export |

Each follows XWUI's structure: `*.types.ts` (data and config), `*.json` (schema), `*.logic.ts` (headless logic on the published `XWUIComponentLogic`), `*.view.ts` (a pure projector of view nodes), `*.css`, and an adapter extending the published `XWUIComponent`; the diagram's geometry is a pure `*.layout.ts`. `tests/xwflow-components.test.ts` covers their layout, views and renderer. The bundle does not export its engine's view mount, so `src/components/view.ts` provides `h()` and a small renderer for those view nodes.

The published `XWUIComposer` only mounts `xwui-` tags. Rather than register an `xwui-` tag of its own, the app places a component with the kit's `xwflow(name, { data, config, slots, key })`: a published `xwui-box` is mounted and the component is built in its element, as every XWUI component takes its container. `xwflowInstance(key)` reaches it (for example for the SVG export).

## Issues found in the published XWUI bundle

Each was reproduced on the published bundle and has a workaround in this repo.

| Page | What happens | Expected | Workaround |
| --- | --- | --- | --- |
| Website header (any page change) | `XWUIBarSiteHeader.setCurrentPath()` adds another copy of every JSON action: after three pages the bar holds four "Sign in" and four "العربية" buttons over the nav, and Self-host and Docs cannot be clicked | One set of actions | The site frame is keyed by nav section and the header is built fresh per section (`frameKind` in `src/app/app.ts`); `setCurrentPath()` is not called |
| Flows, row Actions menu | `XWUIComposer.element()` (used for table cells) drops a node's `ref`, so the row's dropdown never gets its item handler: Run now, Open in the editor and Show runs do nothing | The picked action runs | `cell()` in `src/ui/kit.ts` hands the ref its instance on the first pointerdown or focusin, before a click reaches the menu |
| Editor, canvas | `XWUIFlowCanvas` captures the pointer on its viewport at pointerdown, so Chrome sends the click to the viewport and a mouse click on a step selects nothing | The clicked step opens in the inspector | The editor keeps the step under the press and calls the canvas's public `select()` when the click lands on the viewport without moving (`src/pages/studio/editor.ts`) |
| Run receipt on a phone | `XWUIRunWaterfall` in its columns layout keeps captions on one line in a 70px column, so "840 ms, 503" and "disabled, skipped" are cut at the card edge | Captions wrap | `public/theme/xwflow/components.css` lets them wrap |
| Every switch (Settings, inspector, admin pages) | `XWUISwitch` names itself only from its visible label and ignores `ariaLabel`, so every unlabelled switch is announced as "Switch" | Each switch is named for what it controls | Each switch carries its name as its label with the kit's `quietLabel` class; `components.css` hides that text on screen and keeps it for screen readers |
| Admin › Branding | `XWUIInputColor` names its hex field by the placeholder and ignores `ariaLabel`: a screen reader reads the primary colour field as "#000000" | "Primary color hex" | The field's placeholder is set to the name; it is never visible because the field always holds a colour |
| Notations, views | No layer stack in the basic tier; the published notation diagram lacks start and end terminators, retry loops, fixed columns and rows and the block notation, so the flowchart drew crossing lines without its end node | The prototype's drawings | `XWFlowLayerStack` and `XWFlowNotationDiagram` (above) |

`XWUIComponent` also fetches a stylesheet for every component class from xwui.dev; the two XWFlow components bundle their own and skip that request (`loadComponentCSS()`).

## Walk the product

| Start here | What it shows |
| --- | --- |
| `#/` | The public site: the product, how a flow runs, migration, then Pricing, Self-host, Integrations and Notations |
| `#/studio` | The assistant. Describe a job; it drafts a flow you review; **Open as a draft** saves it and opens the editor |
| `#/studio/overview` | Today's runs, what needs you, latest runs |
| `#/studio/flows` | The catalog of flows: search, status and folder filters (kept in the address), Create flow, Run a live demo, row actions |
| `#/studio/flows/:id` | The editor: palette, canvas, inspector, test run, pin output, publish, run ledger |
| `#/studio/runs` | Run history with search, status and mode filters |
| `#/studio/runs/:id` | The run receipt: timeline, ledger of every attempt, input, output and error, retry from a step, show on canvas |
| `#/studio/flows/:id/flowchart` | The same flow in another notation. Also `swimlane`, `bpmn`, `sequence`, `sim`, `3d`, and `versions` |
| `#/studio/connections` | Credentials by name only: add, test, reconnect |
| `#/admin` | The operator side. Each rail item has its own page: Overview, Tenants, Audit, Credentials policy, Node registry, Adapters, Branding, Usage, AI governance (`#/admin/<page>`) |
| `#/system/health` | The system side: Health, Schedules, Workers, All executions, Config (`#/system/<page>`) |
| `#/denied` | The Builder role reaching a screen it cannot open (Quotas) |

Studio also has agents, tables, forms, variables, MCP servers, templates, insights and settings.

A typical journey: the assistant drafts "alert sales on chat when an order over 500 arrives", you open it as a draft, the editor shows the steps, **Run** plays a test run, the receipt shows the lookup failing with a 503 on the first try and succeeding on the second, and **Publish** makes the version live.

## How it is built

Pages do not touch the DOM and do not hold copy or sample rows. A page returns XWUI composer nodes. The frame (rail, bar, header) is built once and kept; a page change swaps only the page area.

| Piece | Role |
| --- | --- |
| `src/api/dummy-api.js` | The local API: 67 async operations, a token latency (15 ms reads, 40 ms writes), a small run engine, and session persistence |
| `src/api/data/*.js` | Sample data. Times are offsets from the moment the page loads |
| `src/api/client.ts` | The only data import a page is allowed |
| `src/content/*.ts` | Every visible string |
| `src/ui/kit.ts` | The shared node vocabulary: stack, row, grid, glass, band, text, button, tag, and `xwflow()` for app components |
| `src/pages/**` | One module per screen. Each exports `view()` |
| `src/components/**` | The XWFlow components |
| `src/app/router.ts` | Hash routes for the website, studio, editor, views, admin and system |
| `src/app/shells/` | The site header, the studio rail and bar, and the admin rail, composed from XWUI |
| `src/xwui.ts`, `src/xwui-cdn.d.ts` | The XWUI classes the app uses, from xwui.dev, and their types |
| `public/theme/xwflow/`, `public/brand/` | The xwflow theme parts and the logo |

### Design tokens, not literals

Colours, type and spacing come from the xwflow theme (`public/theme/xwflow/brand.css`). The app names a token, never a value:

- Type: `--type-<step>-size`, `-leading` and `-tracking` for mega, hero, h1 to h4, display, lead, body, small and xs.
- Gradients: `--brand-text-gradient` and `--brand-wordmark-fade`.
- Spacing: one scale on a 4 px grid, `--space-xs` 4 to `--space-xxxl` 48, plus `--space-page` (32 px, 16 px on a phone) and the section rhythm (`--space-hero`, `--space-section-s`, `--space-section`). The kit's `stack`, `row`, `grid`, `glass` and `band` take only these step names.

## Guard test

`tests/xwui-only.test.ts` reads every page, shell, kit module and component, and fails the suite on:

- building elements by hand in pages, shells or the kit (`createElement`, `innerHTML`, `append`, class or style writes), or constructing an XWUI class directly (the one root composer in `app.ts` excepted);
- page stylesheets or CSS imports;
- colour literals (hex, rgba), type literals (clamp, rem, em) and spacing literals (px gaps, paddings, margins);
- an app component without XWUI's split (types, schema, logic, view, stylesheet, adapter), not extending the published `XWUIComponent`, named XWUI, or registering a tag of its own.

Two places hold pixel numbers because their component takes a number: the marquee's item gap and the editor canvas insets, both on the scale. The branding page's WCAG check names its two reference inks in `src/app/contrast.ts`. The only other direct DOM use is browser plumbing: finding `#app` to mount, the theme attributes on `<html>`, the page title, keyboard shortcuts, the editor reading which step a press started on (see the issues above), and the link in `src/app/exporters.ts` that saves an exported file.

## Tests and checks

- `npm test`: 130 tests over the dummy API (studio, admin and operator console), the XWFlow components, router, formatting, status, simulation, exporters, contrast and the guard.
- On the published bundle (`npm run dev`), headless:
  - every route loads without errors at 1440 px, and at 390 px nothing reaches past the screen edge;
  - a scripted walkthrough clicks through the website, assistant, flows, editor, receipts, runs, connections, the six views, settings, admin and every admin and system page and action: 111 checks, all passing;
  - the exports (SVG, BPMN XML, Mermaid, PlantUML, JSON) download.

## Performance

Measured headless on the published bundle in dev mode:

- Moving between pages: 114 to 207 ms. The frame is kept and only the page swaps; the dummy API waits 15 ms per read.
- First load: about 0.9 to 1.2 s to DOMContentLoaded and 1.2 to 1.3 s to the Flows table.
- Pages are loaded on demand and preloaded when the browser is idle. The published basic bundle is 3.96 MB (957 KB gzipped) and is loaded once.

## Assumptions

- There is no sign-in. The current person is "You", in the Builder role, so Quotas opens the denied screen.
- The website header follows the prototype's Main board on every page (Product, Notations, Integrations, Migrate, Pricing, Self-host, Docs, العربية). The Notations and Pricing boards each leave a link out; the header stays the same everywhere. Docs opens the Self-host quickstart, because the prototype has no documentation site.
- The prototype has boards for Overview, Branding, Audit, Health and the denied state. The other rail items (Tenants, Credentials policy, Node registry, Adapters, Usage, AI governance, Schedules, Workers, All executions, Config) are designed here in the same style, on the dummy API, and every change they make is written to the audit log. Quotas opens the Builder role's denied screen, as the prototype shows.
- Prices, start commands and dialect depth stay visible placeholders, as the prototype shows them.
- Runs, the simulation and the health checks are simulated in the browser. The assistant matches the prompt to sample recipes in the dummy API and does not call a live model; a prompt it does not recognise gets the order alert example. Speech input uses the browser's speech recognition when the browser has it.
- The tenant is on the Core plan. Saving the brand kit and configuring audit streaming are disabled with the Commercial note; logo and favicon uploads say they belong to Commercial.
- On Notations, 3D and 2D open the live views of the sample flow, Timeline opens a run receipt, and List and Code say they are concepts in this preview.
- Export receipt copies the receipt as JSON. Diagram views export SVG, BPMN XML, Mermaid and PlantUML files.
- The workspace is kept for the browser session (sessionStorage). Clearing site data restores the sample workspace.
- Health draws 14 days because `XWUIUptimeBar` accepts at most 14.

## Not in this front end

- Identity screens, billing and real execution. Those belong to other tiers. This app shows the denial and the quota, and it never invents a login.
- A live language model. The assistant is a working interaction over the dummy API.
- The Arabic interface. العربية in the header says it comes in the next release; the app does not switch to Arabic or right to left yet.

## Known limits

- The workarounds above depend on the published components as they are today; when xwui.dev fixes them, the workarounds can go.
- About 60 positions of decorative glows (halos, orbs, rings) are pixel offsets in page config, copied from the prototype's placement.
- The app needs network access to xwui.dev for XWUI and the generic style parts.
