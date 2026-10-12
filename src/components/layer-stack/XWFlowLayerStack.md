# XWFlowLayerStack

Stacks panels on glowing planes in 3D, each labelled at its side: the Notations hero shows one flow as a flowchart, BPMN and a node graph, one above the other. It extends the published `XWUIComponent`; XWUI basic has no layer stack.

## Use it

In a page, through the kit (the published composer only mounts `xwui-` tags). `slots.panels` are XWUI nodes, one per layer, turned into elements:

```ts
xwflow("layer-stack", { data: { label, layers }, slots: { panels: [flowchartThumb, bpmnThumb, graphThumb] } });
```

As a custom element, anywhere:

```html
<xwflow-layer-stack spacing="150"></xwflow-layer-stack>
<!-- then: element.data = { label, layers, panels } -->
```

Or directly: `new XWFlowLayerStack(container, data, config)`.

## Data

| Field | Type | Meaning |
| --- | --- | --- |
| `layers` | `{ label, hue? }[]` | Bottom first: the first lies lowest, the last floats on top |
| `panels` | `HTMLElement[]` | One element per layer, in the same order, drawn on its plane |
| `label` | string | Spoken description of the whole drawing |

## Config

| Field | Meaning | Default |
| --- | --- | --- |
| `tiltX`, `tiltZ` | Plane tilt in degrees (rotateX, then rotateZ) | 60, -34 |
| `spacing` | Height between layers in pixels | 150 |
| `width`, `height` | Plane size before the tilt, in pixels | |
| `viewHeight` | Height of the whole drawing in pixels | |
| `className` | Extra class on the root | |

## Methods

`setData(partial)` and `updateConfig(partial)` redraw it; each panel element is placed on its plane after the planes render.

## Accessibility

With a `label`, the drawing is an image with that name; the panels inside are decorative copies of what the page shows elsewhere.

## Styling

`XWFlowLayerStack.css` draws the planes, their glow and the side labels from the theme's hue tokens (`--xwui-hue-*`). Classes start with `xwflow-layer-stack`.

## Files

`.types.ts`, `.json` (schema), `.logic.ts`, `.view.ts` (pure projector), `.css`, `.examples.ts`, and the adapter `XWFlowLayerStack.ts`. Tests: `tests/xwflow-components.test.ts`.
