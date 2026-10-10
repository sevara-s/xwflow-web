# XWFlowBrand

The xwflow mark and wordmark, linking home.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowBrand(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `label` (required) | `string` |  |
| `href` (required) | `string` |  |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `markOnly` | `boolean` | Show only the mark, for compact headers. |
| `size` | `"sm" \| "md"` |  |

## Files

- `XWFlowBrand.css`
- `XWFlowBrand.md`
- `XWFlowBrand.schema.json`
- `XWFlowBrand.ts`
- `XWFlowBrand.types.ts`
- `XWFlowBrand.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowbrand`, so the base class does not request them from the CDN.
