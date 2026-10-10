# XWFlowShape

Decorative depth: a glowing orb, a gradient ring, a glass cube or a soft halo. Hidden from assistive technology.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowShape(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `kind` (required) | `ShapeKind` |  |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `size` | `number` | Edge length or diameter in pixels. |
| `color` | `"lime" \| "cyan" \| "violet" \| "pink" \| "orange"` | Any xwflow palette name: lime, cyan, violet, pink, orange. |
| `thickness` | `number` | Ring thickness in pixels. |
| `place` | `Partial<Record<"top" \| "right" \| "bottom" \| "left", string>>` | Absolute placement inside a positioned parent, as CSS lengths. |
| `still` | `boolean` | Stop animating, for small or repeated shapes. |
| `className` | `string` |  |

## Files

- `XWFlowShape.css`
- `XWFlowShape.md`
- `XWFlowShape.schema.json`
- `XWFlowShape.ts`
- `XWFlowShape.types.ts`
- `XWFlowShape.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowshape`, so the base class does not request them from the CDN.
