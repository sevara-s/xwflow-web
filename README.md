# xwflow

A working front end for the xwflow prototype (22 boards). An organization defines a process, publishes a version, runs that version, and reads a receipt of every step from start to finish.

The same flow can be drawn as a node graph, a flowchart, a swimlane, BPMN, a sequence diagram, a simulation, or a 3D scene. The assistant turns a sentence into a draft. Nothing goes live until it is published.

The whole UI is built from XWUI components. Components the prototype needed and XWUI did not have were created in `xwui-lib` first and then used here. All data comes from a local JavaScript dummy API.

## Requirements

- Node.js 18 or newer (developed on Node 26) and npm.
- A current Chrome, Edge, Firefox or Safari.
- For local XWUI mode only: a checkout of `xwui-lib` (see below).

## Setup

```bash
npm install
npm run dev         # http://127.0.0.1:4173
npm test            # Vitest: 98 tests in 11 files
npm run typecheck   # tsc --noEmit
npm run build       # typecheck, then dist/
npm run preview     # serve dist/
```

The only npm packages are TypeScript, Vite, Vitest and esbuild (esbuild bundles XWUI in local mode). There is no second component library and no CSS framework.

## XWUI: published or local

The app imports XWUI from the published basic tier, `https://xwui.dev/esm/basic.bundle.js`, and its theme from `https://xwui.dev/styles/presets/xwflow-neon.css`.

The components, tokens and fixes made for this product live in `xwui-lib` on `main`. **Until xwui.dev is republished from `main`, the published bundle and theme do not have them.** In that state `npm run dev` shows the pages without the xwflow type scale, spacing and new components. To see the product as built, run against a checkout of `xwui-lib`:

```bash
XWUI_LOCAL=/path/to/xwui-lib npm run dev
```

In local mode, Vite bundles the checkout's basic tier into one module with esbuild, rebuilds it when the checkout changes, and serves the checkout's theme. After a style change in `xwui-lib`, run `npm run build:styles` there. Local mode is for development only: `npm run build` always keeps the xwui.dev URLs.

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
| `#/admin` | The operator side: overview, branding, audit, system health (`#/system/health`) |
| `#/denied` | The Builder role reaching a screen it cannot open (Quotas) |

Studio also has agents, tables, forms, variables, MCP servers, templates, insights and settings.

A typical journey: the assistant drafts "alert sales on chat when an order over 500 arrives", you open it as a draft, the editor shows the steps, **Run** plays a test run, the receipt shows the lookup failing with a 503 on the first try and succeeding on the second, and **Publish** makes the version live.

## How it is built

Pages do not touch the DOM and do not hold copy or sample rows. A page returns XWUI composer nodes (`{ tag, data, config, slots }`). One `XWUIComposer` mounts the tree. The frame (rail, bar, header) is built once and kept; a page change swaps only the page area.

| Piece | Role |
| --- | --- |
| `src/api/dummy-api.js` | The local API: 67 async operations, a token latency (15 ms reads, 40 ms writes), a small run engine, and session persistence |
| `src/api/data/*.js` | Sample data. Times are offsets from the moment the page loads |
| `src/api/client.ts` | The only data import a page is allowed |
| `src/content/*.ts` | Every visible string |
| `src/ui/kit.ts` | The shared node vocabulary: stack, row, grid, glass, band, text, button, tag. Each function returns an XWUI node |
| `src/pages/**` | One module per screen. Each exports `view()` |
| `src/app/router.ts` | Hash routes for the website, studio, editor, views, admin and system |
| `src/app/shells/` | The site header, the studio rail and bar, and the admin rail, composed from XWUI |
| `src/xwui.ts` | The XWUI classes the app uses, from the basic tier |

### Design tokens, not literals

Colours, type and spacing come from the xwflow brand in `xwui-lib` (`xwui-lib-style/src/brand/xwflow/brand.css`). The app names a token, never a value:

- Type: `--type-<step>-size`, `-leading` and `-tracking` for mega, hero, h1 to h4, display, lead, body, small and xs.
- Gradients: `--brand-text-gradient` and `--brand-wordmark-fade`.
- Spacing: one scale on a 4 px grid, `--space-xs` 4 to `--space-xxxl` 48, plus `--space-page` (32 px, 16 px on a phone) and the section rhythm (`--space-hero`, `--space-section-s`, `--space-section`). The kit's `stack`, `row`, `grid`, `glass` and `band` take only these step names.

## XWUI only

`tests/xwui-only.test.ts` reads every page, shell, kit and app module and fails the suite on:

- building elements by hand (`createElement`, `innerHTML`, `append`, class or style writes),
- constructing an XWUI class directly (the one root composer in `app.ts` excepted),
- app components or CSS files and imports,
- colour literals (hex, rgba), type literals (clamp, rem, em) and spacing literals (px gaps, paddings, margins).

Two places hold pixel numbers because their component takes a number: the marquee's item gap and the editor canvas insets, both values on the scale. The branding page's WCAG check names its two reference inks in `src/app/contrast.ts`.

The only direct DOM use left is browser plumbing, not UI: finding `#app` to mount, the theme attributes on `<html>`, the page title, keyboard shortcuts, and, in `src/app/exporters.ts`, the link that saves an exported file. That last one moves to `XWUIButtonDownload.saveText()` once xwui.dev is republished (it is in `xwui-lib` `main`).

The app uses 56 XWUI components. These 20 were created in `xwui-lib` for this product: AppBar, AppRail, BrandPreview, Composer, FlowCanvas, FlowScene, GlowShape, IconTile, IsoStack, IsoTiles, KpiCard, LayerStack, NotationDiagram, NotationThumb, RunWaterfall, SparkBars, StackedBars, StatusGlyph, StepChain and Workbench. Existing components were extended where the prototype needed it (for example Button, Box, BarSiteHeader, UptimeBar, InputColor, Logo, Typography, ButtonDownload).

## Tests and checks

- `npm test`: 98 unit tests over the dummy API, router, status, simulation, exporters, contrast and the XWUI-only guard.
- The components created in `xwui-lib` carry their own tests there, each run under the native, React, Vue and Preact engines.
- Every route loads headless without errors at 1440 px, and at 390 px nothing reaches past the screen edge.
- A scripted walkthrough clicks through the website, assistant, flows, editor, receipts, runs, connections, views, settings and admin (89 checks, all passing in local mode).

## Performance

Measured headless in local mode:

- Moving between pages: 110 to 230 ms (330 to 560 ms before the frame was kept and the dummy latency cut).
- First load: about 0.9 s and 70 requests (1.6 to 3.5 s and about 3,000 requests before XWUI was bundled in local mode).
- Pages are loaded on demand and preloaded when the browser is idle.

## Assumptions

- There is no sign-in. The current person is "You", in the Builder role, so Quotas opens the denied screen.
- The website header follows the prototype's Main board on every page (Product, Notations, Integrations, Migrate, Pricing, Self-host, Docs, العربية). The Notations and Pricing boards each leave a link out; the header stays the same everywhere. Docs opens the Self-host quickstart, because the prototype has no documentation site.
- Admin rail items with no board of their own open the closest real screen (for example Tenants opens Branding, Node registry opens Integrations).
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

- The published xwui.dev bundle and theme predate this work, so `npm run dev` without `XWUI_LOCAL` shows the pages unstyled until xwui.dev is republished from `xwui-lib` `main`.
- The published basic bundle is 3.96 MB (957 KB gzipped). Loading it per component would mean about 146 requests, so the app keeps the single bundle.
- About 60 positions of decorative glows (halos, orbs, rings) are pixel offsets in page config, copied from the prototype's placement.
- In `xwui-lib`, 28 tests of the date, date range and time pickers already failed before this work; they are not part of this app.
