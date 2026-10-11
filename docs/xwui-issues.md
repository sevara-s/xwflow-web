# Issues found in the published XWUI bundle

Each was reproduced on the published bundle and has a workaround in this repo.

| Page | What happens | Expected | Workaround |
| --- | --- | --- | --- |
| Website header (any page change) | `XWUIBarSiteHeader.setCurrentPath()` adds another copy of every JSON action: after three pages the bar holds four "Sign in" and four "العربية" buttons over the nav, and Self-host and Docs cannot be clicked | One set of actions | The site frame is keyed by nav section and the header is built fresh per section (`frameKind` in `src/app/app.ts`); `setCurrentPath()` is not called |
| Flows, row Actions menu | `XWUIComposer.element()` (used for table cells) drops a node's `ref`, so the row's dropdown never gets its item handler: Run now, Open in the editor and Show runs do nothing | The picked action runs | `cell()` in `src/ui/kit.ts` hands the ref its instance on the first pointerdown or focusin, before a click reaches the menu |
| Editor, canvas | `XWUIFlowCanvas` captures the pointer on its viewport at pointerdown, so Chrome sends the click to the viewport and a mouse click on a step selects nothing | The clicked step opens in the inspector | The editor keeps the step under the press and calls the canvas's public `select()` when the click lands on the viewport without moving (`src/pages/studio/editor.ts`) |
| Run receipt on a phone | `XWUIRunWaterfall` in its columns layout keeps captions on one line in a 70px column, so "840 ms, 503" and "disabled, skipped" are cut at the card edge | Captions wrap | `public/theme/xwflow/components.css` lets them wrap |
| Every switch (Settings, inspector, admin pages) | `XWUISwitch` names itself only from its visible label and ignores `ariaLabel`, so every unlabelled switch is announced as "Switch" | Each switch is named for what it controls | Each switch carries its name as its label with the kit's `quietLabel` class; `components.css` hides that text on screen and keeps it for screen readers |
| Admin › Branding | `XWUIInputColor` names its hex field by the placeholder and ignores `ariaLabel`: a screen reader reads the primary colour field as "#000000" | "Primary color hex" | The field's placeholder is set to the name; it is never visible because the field always holds a colour |
| Notations, views | No layer stack in the basic tier; the published notation diagram lacks start and end terminators, retry loops, fixed columns and rows and the block notation, so the flowchart drew crossing lines without its end node | The prototype's drawings | `XWFlowLayerStack` and `XWFlowNotationDiagram` (see [architecture.md](architecture.md)) |

`XWUIComponent` also fetches a stylesheet for every component class from xwui.dev; the two XWFlow components bundle their own and skip that request (`loadComponentCSS()`).
