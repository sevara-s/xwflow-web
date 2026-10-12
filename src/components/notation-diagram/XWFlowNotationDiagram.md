# XWFlowNotationDiagram

Draws one flow in a standard notation: a classic flowchart (ISO 5807), swimlanes, BPMN 2.0, a UML sequence diagram, or a simulation in filled block notation with live figures. It extends the published `XWUIComponent`; the app adds it because XWUI basic ships an earlier diagram without start and end terminators, retry loops, fixed columns and rows, or the block notation.

## Use it

In a page, through the kit (the published composer only mounts `xwui-` tags):

```ts
xwflow("notation-diagram", { key: "notation-diagram", data: { title, steps, edges }, config: { mode: "flowchart" } });
```

As a custom element, anywhere:

```html
<xwflow-notation-diagram mode="bpmn"></xwflow-notation-diagram>
<!-- then: element.data = { title, steps, edges, lanes, external } -->
```

Or directly: `new XWFlowNotationDiagram(container, data, config)`.

## Data

| Field | Type | Meaning |
| --- | --- | --- |
| `title` | string | Spoken name of the drawing; the BPMN pool name |
| `steps` | `XWFlowNotationStep[]` | `id`, `name`, `shape` (terminal, process, decision, call, io, store, create, dispose), `hue`, and optionally `lane`, `subtitle`, `stat`, `queue`, `col`, `row`, `disabled` |
| `edges` | `XWFlowNotationEdge[]` | `from`, `to`, optional `label`, `tone` (yes, no) and `dashed`; an edge from a step to itself is a retry loop |
| `lanes` | `XWFlowNotationLane[]` | Swimlane and BPMN lanes: `id`, `name`, `hue` |
| `external` | `{ name, note? }` | BPMN: the outside participant as a collapsed pool |
| `messages`, `actor`, `selectedMessage` | | Sequence: the numbered rows, the active lifeline and the chosen row |
| `labels` | `{ alt?, message?, queue? }` | Words the drawing shows, in the reader's language |

## Config

| Field | Values | Default |
| --- | --- | --- |
| `mode` | `flowchart`, `swimlane`, `bpmn`, `sequence`, `simulation` | `flowchart` |
| `className` | string | |

## Methods and events

- `setData(partial)`, `updateConfig(partial)`: redraw with new data or another mode.
- `select(id)` and `on("select", ({ id }) => …)`: the chosen sequence row.
- `toSvg()`: the drawing as standalone SVG text, for export.

## Accessibility

The drawing is an image with the title as its name. In sequence mode with a select handler it is a group of buttons instead: each row is focusable, named "1. POST /orders" and so on, chosen with a click, Enter or Space, and reports `aria-pressed`.

## Styling

`XWFlowNotationDiagram.css` holds the layout; colours come from the theme's hue tokens (`--xwui-hue-*`) and text tokens. Classes start with `xwflow-notation-diagram`.

## Files

`.types.ts` (data and config), `.json` (schema), `.logic.ts` (state and selection), `.layout.ts` (pure geometry), `.view.ts` (pure projector), `.css`, `.examples.ts` (one example per mode), and the adapter `XWFlowNotationDiagram.ts`. Tests: `tests/xwflow-components.test.ts`.
