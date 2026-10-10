# XWFlowWaterfall

A run's attempts on one time axis: when each step started and how long it took.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowWaterfall(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `rows` (required) | `WaterfallRow[]` |  |
| `label` (required) | `string` | Spoken label for the whole chart. |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `minShare` | `number` | Duration drawn when a step took no measurable time, as a share of the axis. |
| `className` | `string` |  |

## Built from

`XWFlowGroups`.

## Files

- `XWFlowWaterfall.css`
- `XWFlowWaterfall.logic.ts`
- `XWFlowWaterfall.md`
- `XWFlowWaterfall.schema.json`
- `XWFlowWaterfall.ts`
- `XWFlowWaterfall.types.ts`
- `XWFlowWaterfall.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowwaterfall`, so the base class does not request them from the CDN.
