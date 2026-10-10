# XWFlowChain

A flow's steps in order, one coloured dot per step group.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowChain(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `groups` (required) | `StepGroup[]` |  |
| `label` (required) | `string` | Read by assistive technology in place of the dots. |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `className` | `string` |  |

## Built from

`XWFlowGroups`.

## Files

- `XWFlowChain.css`
- `XWFlowChain.md`
- `XWFlowChain.schema.json`
- `XWFlowChain.ts`
- `XWFlowChain.types.ts`
- `XWFlowChain.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowchain`, so the base class does not request them from the CDN.
