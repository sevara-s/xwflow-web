# XWFlowGauge

A ring that fills with progress and shows "value/total" in its centre.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowGauge(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `value` (required) | `number` |  |
| `total` (required) | `number` |  |
| `caption` (required) | `string` | Word under the number, e.g. "recorded". |
| `label` (required) | `string` | Spoken label, e.g. "3 of 5 steps recorded". |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `tone` | `"green" \| "red" \| "cyan"` |  |
| `size` | `number` |  |
| `className` | `string` |  |

## Files

- `XWFlowGauge.css`
- `XWFlowGauge.logic.ts`
- `XWFlowGauge.md`
- `XWFlowGauge.schema.json`
- `XWFlowGauge.ts`
- `XWFlowGauge.types.ts`
- `XWFlowGauge.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowgauge`, so the base class does not request them from the CDN.
