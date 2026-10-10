# XWFlowDiagram

One flow drawn in a standard notation: an ISO 5807 flowchart, swimlanes by system, a BPMN 2.0 collaboration, or a UML sequence built from a real run receipt, where each numbered dot is a ledger row.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowDiagram(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `mode` (required) | `DiagramMode` |  |
| `steps` (required) | `ViewStep[]` |  |
| `edges` (required) | `CanvasEdge[]` |  |
| `systems` (required) | `Array<{ id: SystemId; name: string }>` |  |
| `attempts` (required) | `Attempt[]` | Attempts of the run a sequence diagram is drawn from. |
| `labels` (required) | `{` | Words drawn inside the diagram. |
| `selectedAttempt` | `string \| null` | Highlight one ledger row in the sequence. |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `laneBy` | `"system" \| "group"` | Lane by system (default) or one lane per step group. |
| `className` | `string` |  |

## Events

Subscribe with `component.on(name, handler)`.

| Field | Type | Notes |
| --- | --- | --- |
| `attempt` (required) | `(attemptId: string) => void` | A numbered ledger dot was chosen in the sequence. |

## Files

- `XWFlowDiagram.css`
- `XWFlowDiagram.logic.ts`
- `XWFlowDiagram.md`
- `XWFlowDiagram.schema.json`
- `XWFlowDiagram.ts`
- `XWFlowDiagram.types.ts`
- `XWFlowDiagram.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowdiagram`, so the base class does not request them from the CDN.
