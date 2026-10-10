# XWFlowSparkBars

A compact bar sparkline (runs per hour) where failing periods turn red.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowSparkBars(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `bars` (required) | `SparkBar[]` |  |
| `label` (required) | `string` | Spoken summary; the bars themselves are decorative. |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `height` | `number` |  |
| `className` | `string` |  |

## Files

- `XWFlowSparkBars.css`
- `XWFlowSparkBars.logic.ts`
- `XWFlowSparkBars.md`
- `XWFlowSparkBars.schema.json`
- `XWFlowSparkBars.ts`
- `XWFlowSparkBars.types.ts`
- `XWFlowSparkBars.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowsparkbars`, so the base class does not request them from the CDN.
