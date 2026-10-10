# XWFlowStatus

A run or step state: a shaped glyph plus words. The shape carries the meaning as well as the colour (diamond for a failure, triangle for a warning, spinner while running), so it reads without colour vision.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowStatus(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `tone` (required) | `StatusTone` |  |
| `label` (required) | `string` |  |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `size` | `"sm" \| "md"` | `sm` for dense tables and canvas nodes. |
| `className` | `string` |  |

## Files

- `XWFlowStatus.css`
- `XWFlowStatus.md`
- `XWFlowStatus.schema.json`
- `XWFlowStatus.ts`
- `XWFlowStatus.types.ts`
- `XWFlowStatus.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowstatus`, so the base class does not request them from the CDN.
