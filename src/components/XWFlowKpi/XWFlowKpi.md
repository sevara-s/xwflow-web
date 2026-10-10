# XWFlowKpi

A headline number on a glowing tile. The number itself is an XWUIDisplayStatistic.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowKpi(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `label` (required) | `string` |  |
| `value` (required) | `number \| null` | null when the value was not recorded; `emptyLabel` shows instead. |
| `emptyLabel` | `string` |  |
| `note` | `string` | Small print under the value, such as "as of 12 s ago". |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `tone` | `KpiTone` | Colour of the glow in the corner. |
| `emphasis` | `boolean` | Colour the number itself, for alarming values. |
| `className` | `string` |  |

## Built from

`XWUIDisplayStatistic`.

## Files

- `XWFlowKpi.css`
- `XWFlowKpi.md`
- `XWFlowKpi.schema.json`
- `XWFlowKpi.ts`
- `XWFlowKpi.types.ts`
- `XWFlowKpi.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowkpi`, so the base class does not request them from the CDN.
