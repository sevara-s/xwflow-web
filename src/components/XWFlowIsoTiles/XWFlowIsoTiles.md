# XWFlowIsoTiles

Services as lifted tiles on an isometric plane, coloured by state; failing ones pulse.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowIsoTiles(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `tiles` (required) | `IsoTile[]` |  |
| `label` (required) | `string` | Spoken summary of the drawing. |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `variant` | `"tile" \| "hub"` | `tile` for big squares (reachability), `hub` for small nodes (topology). |
| `width` | `number` |  |
| `height` | `number` |  |
| `tilt` | `{ x: number; z: number }` |  |
| `floor` | `boolean` | Draw the glowing grid floor under the tiles. |
| `links` | `boolean` | Wires from the first tile to every other tile. |
| `className` | `string` |  |

## Files

- `XWFlowIsoTiles.css`
- `XWFlowIsoTiles.md`
- `XWFlowIsoTiles.schema.json`
- `XWFlowIsoTiles.ts`
- `XWFlowIsoTiles.types.ts`
- `XWFlowIsoTiles.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowisotiles`, so the base class does not request them from the CDN.
