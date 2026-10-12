# Issues found in the published XWUI bundle

Each was reproduced on the published bundle and has a workaround in this repo.

| Page | What happens | Expected | Workaround |
| --- | --- | --- | --- |
| Website header (any page change) | `XWUIBarSiteHeader.setCurrentPath()` adds another copy of every JSON action: after three pages the bar holds four "Sign in" and four "العربية" buttons over the nav, and Self-host and Docs cannot be clicked | One set of actions | The site frame is keyed by nav section and the header is built fresh per section (`frameKind` in `src/app/app.ts`); `setCurrentPath()` is not called |
| Flows, row Actions menu | `XWUIComposer.element()` (used for table cells) drops a node's `ref`, so the row's dropdown never gets its item handler: Run now, Open in the editor and Show runs do nothing | The picked action runs | `cell()` in `src/ui/kit.ts` hands the ref its instance on the first pointerdown or focusin, before a click reaches the menu |
| Editor, canvas | `XWUIFlowCanvas` captures the pointer on its viewport at pointerdown, so Chrome sends the click to the viewport and a mouse click on a step selects nothing | The clicked step opens in the inspector | The editor keeps the step under the press and calls the canvas's public `select()` when the click lands on the viewport without moving (`src/pages/studio/editor.ts`) |
| Editor, canvas fit | `XWUIFlowCanvas` fits the flow once when it mounts, before `XWUIWorkbench` has sized its stage, and never again: the flow opens as a thumbnail at the top of the canvas until Fit view is pressed. Its insets are fixed, so when the workbench stacks its panels under the stage (1100 px and below) the fit still keeps clear of side panels that are no longer there | The flow fills the free canvas on open, at every width | The editor refits whenever the canvas changes size (a `ResizeObserver` on the canvas's root block; the `xwui-flow-canvas` tag itself is inline and never reported), with insets that follow the layout: clear of the panels beside the stage, plain gaps when they are stacked (`breakpoints.workbench` in `src/ui/layout.ts`, `src/pages/studio/editor.ts`) |
| Editor, canvas tools and minimap | `XWUIFlowCanvas` places its zoom tools and minimap 16px inside the bottom fit inset, which is inside the area it fits the flow into, so the minimap covered the lowest steps (Log order) | The flow and the overlays do not overlap | The editor's fit leaves a strip at the foot (`PANEL.foot`), and `components.css` keeps the overlays in it (`.xwflow-canvas-footed`, `--xwflow-canvas-foot`) |
| Run receipt on a phone | `XWUIRunWaterfall` in its columns layout keeps captions on one line in a 70px column, so "840 ms, 503" and "disabled, skipped" are cut at the card edge | Captions wrap | `public/theme/xwflow/components.css` lets them wrap |
| Every switch (Settings, inspector, admin pages) | `XWUISwitch` names itself only from its visible label and ignores `ariaLabel`, so every unlabelled switch is announced as "Switch" | Each switch is named for what it controls | Each switch carries its name as its label with the kit's `quietLabel` class; `components.css` hides that text on screen and keeps it for screen readers |
| Admin › Branding | `XWUIInputColor` names its hex field by the placeholder and ignores `ariaLabel`: a screen reader reads the primary colour field as "#000000" | "Primary color hex" | The field's placeholder is set to the name; it is never visible because the field always holds a colour |
| Notations, views | No layer stack in the basic tier; the published notation diagram lacks start and end terminators, retry loops, fixed columns and rows and the block notation, so the flowchart drew crossing lines without its end node | The prototype's drawings | `XWFlowLayerStack` and `XWFlowNotationDiagram` (see [architecture.md](architecture.md)) |

`XWUIComponent` also fetches a stylesheet for every component class from xwui.dev; the two XWFlow components bundle their own and skip that request (`loadComponentCSS()`).

## Accessibility defects inside published components

Found by the axe scan in `e2e/a11y.spec.ts` (WCAG 2.1 A/AA and best practice). Our own markup passes on all 42 routes; these elements sit inside published components, so the scan leaves exactly them out.

| Component | What axe reports | Workaround here |
| --- | --- | --- |
| `XWUITable` | Every table host carries `role="tab"` with no tablist (aria-required-parent) | None possible from outside; the rule is disabled for tables only |
| `XWUIProgress` | A second `progressbar` without a name inside the named host | None; the host is named |
| `XWUISlider` | The thumb is nested inside another control (nested-interactive) | The slider is named through its label, kept for screen readers only |
| `XWUIFlowScene` | `role="img"` around focusable controls (nested-interactive) | None |
| `XWUITooltip` | Tooltips are attached to `<body>`, outside every landmark (region) | None |
| `XWUIAvatar` | Initials on some generated colours fall below a 4.5:1 contrast | None; names sit beside the avatars |
| `XWUICodeBlock` | The scroll area takes no keyboard focus (scrollable-region-focusable) | None |
| `XWUIBox` | A `role` or `ariaLabel` is copied to both the host and the inner element, so a labelled region becomes two | Landmarks use the element itself (`as: "main"`, `as: "aside"`), without a label |
| `XWUISelect`, `XWUISlider` | `ariaLabel` is ignored; the control is named only by its label | The label is passed with the `quietLabel` class, which keeps it for screen readers |
