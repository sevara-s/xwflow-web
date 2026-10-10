# XWFlowStackedBars

Stacked columns over time: the healthy part as a gradient, failures in red on top.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowStackedBars(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `bars` (required) | `StackedBar[]` |  |
| `label` (required) | `string` |  |
| `start` (required) | `string` | Captions under the first and last bar. |
| `end` (required) | `string` |  |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `height` | `number` |  |
| `className` | `string` |  |

## Files

- `XWFlowStackedBars.css`
- `XWFlowStackedBars.logic.ts`
- `XWFlowStackedBars.md`
- `XWFlowStackedBars.schema.json`
- `XWFlowStackedBars.ts`
- `XWFlowStackedBars.types.ts`
- `XWFlowStackedBars.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowstackedbars`, so the base class does not request them from the CDN.
