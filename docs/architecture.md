# xwflow: architecture

How the app is put together. The [README](../README.md) has setup, assumptions and incomplete items; [xwui-issues.md](xwui-issues.md) lists the problems found in the published XWUI bundle.

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

## The dummy API

Every operation is asynchronous and returns a copy, so the UI can never change the store by accident. Data lives for the browser session (sessionStorage); clearing site data restores the samples.

- Latency: 15 ms per read and 40 ms per write by default. `?api-latency=none|fast|slow` changes it (slow is 600 ms and 1.2 s), to watch spinners and loading states.
- Failures: `?api-failures=0.3` makes that share of writes fail before changing anything, as a dropped request would; the app shows the error and the data stays as it was. `?api-failures=1` fails every write.
- Errors carry a `code` (`not_found`, `invalid`, `exists`, `in_use`, `requires_commercial`, `unavailable` and others) and a message the page shows as it is.
- Tests set the same knobs with `configureApi()` from `src/api/core.js`.

## How it is built

Pages do not touch the DOM and do not hold copy or sample rows. A page returns XWUI composer nodes. The frame (rail, bar, header) is built once and kept; a page change swaps only the page area.

| Piece | Role |
| --- | --- |
| `src/api/dummy-api.js` | The local API's single entry: it re-exports the nine domain modules in `src/api/modules/` (studio, site, admin, views, project, workspace, console), 67 async operations in all |
| `src/api/core.js`, `src/api/engine.js` | The session store, simulated latency and failures, ids, errors and audit; the run engine and the projections operations return |
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

Decorative glows are named presets in `src/ui/decor.ts`; a page names one with `decoration()`, and the guard refuses raw offsets elsewhere. Layout numbers are named presets in `src/ui/layout.ts`: card widths for auto-fit grids (`grid(cards, "card")`), column splits (`columns.twoOne`), the page and text widths (`pageMax`, `measure(child, "search")`) and the phone and tablet breakpoints; the guard refuses those numbers in pages and shells. Two places hold pixel numbers because their component takes a number: the marquee's item gap and the editor canvas insets, both on the scale. The branding page's WCAG check names its two reference inks in `src/app/contrast.ts`. The only other direct DOM use is browser plumbing: finding `#app` to mount, the theme attributes on `<html>`, the page title, keyboard shortcuts, the editor reading which step a press started on (see xwui-issues.md), and the link in `src/app/exporters.ts` that saves an exported file.

## Tests and checks

- `npm test`: 131 unit and component tests over the dummy API (studio, admin and operator console), the XWFlow components (layout, views, renderer), router, formatting, status, simulation, exporters, contrast and the guard. `npm run test:coverage` holds coverage above 75% of statements and lines.
- `npm run lint`: ESLint with the recommended JavaScript and TypeScript rules.
- `npm run e2e`: Playwright browser tests against XWUI from xwui.dev (129 tests): every journey on the website, studio, notation views, admin and system pages; an axe scan (WCAG 2.1 A/AA and best practice) of all 42 routes; and nothing past the screen edge at 390 px on every route.
- `npm run check` runs typecheck, lint, coverage and build. GitHub Actions (`.github/workflows/ci.yml`) runs it and the browser tests on every push and pull request.

## Performance

Measured headless on the published bundle in dev mode:

- Moving between pages: 114 to 207 ms. The frame is kept and only the page swaps; the dummy API waits 15 ms per read.
- First load: about 0.9 to 1.2 s to DOMContentLoaded and 1.2 to 1.3 s to the Flows table.
- Pages are loaded on demand and preloaded when the browser is idle. The published basic bundle is 3.96 MB (957 KB gzipped) and is loaded once.

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
