# XWFlowNotationThumb

A small drawing of the sample flow in one notation: BPMN, sequence, Petri net and so on.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowNotationThumb(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `notation` (required) | `string` | Notation id from the gallery, e.g. "bpmn" or "uml-sequence". |
| `steps` (required) | `ThumbStep[]` |  |
| `label` (required) | `string` | Spoken description of the drawing. |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `className` | `string` |  |

## Files

- `XWFlowNotationThumb.css`
- `XWFlowNotationThumb.logic.ts`
- `XWFlowNotationThumb.md`
- `XWFlowNotationThumb.schema.json`
- `XWFlowNotationThumb.ts`
- `XWFlowNotationThumb.types.ts`
- `XWFlowNotationThumb.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflownotationthumb`, so the base class does not request them from the CDN.
