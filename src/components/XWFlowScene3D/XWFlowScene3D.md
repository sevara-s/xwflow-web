# XWFlowScene3D

A flow lifted into 3D: an XWFlowCanvas laid on a tilted, glowing floor, with each step hovering at its own depth. Optional orbit by dragging, and zoom from the page's own controls.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowScene3D(container, data, conf_comp)`.

## Data

Everything `XWFlowCanvas` takes, plus:

| Field | Type | Notes |
| --- | --- | --- |
| `depths` | `Record<string, number>` | Height of each step above the floor in pixels; steps without one rise by order. |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `width` | `number` | Plane size in pixels before the tilt. |
| `height` | `number` |  |
| `tilt` | `{ x: number; z: number }` | Tilt of the plane: rotateX then rotateZ, in degrees. |
| `nodeWidth` | `number` | Card width of the floating steps. |
| `ring` | `boolean` | Draw the gradient ring under the middle of the flow. |
| `orbit` | `boolean` | Let people orbit the scene by dragging. |
| `lanes` | `Array<{ label: string; color: "lime" \| "cyan" \| "violet" \| "pink" \| "orange" }>` | Floor bands, top to bottom, e.g. one per system. |
| `className` | `string` |  |

## Built from

`XWFlowCanvas`.

## Files

- `XWFlowScene3D.css`
- `XWFlowScene3D.logic.ts`
- `XWFlowScene3D.md`
- `XWFlowScene3D.schema.json`
- `XWFlowScene3D.ts`
- `XWFlowScene3D.types.ts`
- `XWFlowScene3D.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowscene3d`, so the base class does not request them from the CDN.
