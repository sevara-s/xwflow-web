# XWFlowCanvas

The flow canvas. It draws steps as cards wired output to input, with frames and sticky notes. Editable canvases support selecting, dragging, wheel and button zoom, fit, tidy up and a minimap; read-only canvases only fit and display.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowCanvas(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `graph` (required) | `FlowGraph` |  |
| `views` (required) | `Record<string, CanvasNodeView>` | Presentation for each node, keyed by node id. |
| `selectedId` (required) | `string \| null` |  |
| `labels` (required) | `{` |  |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `nodeWidth` | `number` | Node card width in pixels. |
| `readOnly` | `boolean` | Read-only canvases cannot be dragged or zoomed. |
| `tools` | `boolean` | Show zoom, fit and tidy tools. |
| `minimap` | `boolean` |  |
| `insets` | `Partial<CanvasInsets>` | Space the fit leaves for floating panels. |
| `maxFitScale` | `number` | Fit never enlarges past this scale. |
| `height` | `number` | Fixed height for embedded canvases; full-bleed canvases fill their parent. |
| `className` | `string` |  |

## Events

Subscribe with `component.on(name, handler)`.

| Field | Type | Notes |
| --- | --- | --- |
| `select` (required) | `(nodeId: string) => void` |  |
| `move` (required) | `(nodeId: string, x: number, y: number) => void` |  |
| `tidy` (required) | `(positions: Array<Pick<CanvasNode, "id" \| "x" \| "y">>) => void` |  |

## Built from

`XWUIButton`, `XWFlowGroups`, `XWFlowStatus`, `XWFlowStepIcon`.

## Files

- `XWFlowCanvas.css`
- `XWFlowCanvas.logic.ts`
- `XWFlowCanvas.md`
- `XWFlowCanvas.schema.json`
- `XWFlowCanvas.ts`
- `XWFlowCanvas.types.ts`
- `XWFlowCanvas.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowcanvas`, so the base class does not request them from the CDN.
