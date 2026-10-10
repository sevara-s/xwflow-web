# XWFlowStepIcon

The glowing tile that marks a step's group, with an XWUI icon inside.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowStepIcon(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `icon` (required) | `string` | XWUI icon name. |
| `group` (required) | `StepGroup` |  |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `size` | `"sm" \| "md"` |  |
| `ghost` | `boolean` | Ghost tiles tint the outline instead of filling the tile. |
| `className` | `string` |  |

## Built from

`XWUIIcon`, `XWFlowGroups`.

## Files

- `XWFlowStepIcon.css`
- `XWFlowStepIcon.md`
- `XWFlowStepIcon.schema.json`
- `XWFlowStepIcon.ts`
- `XWFlowStepIcon.types.ts`
- `XWFlowStepIcon.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowstepicon`, so the base class does not request them from the CDN.
