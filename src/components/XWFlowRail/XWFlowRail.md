# XWFlowRail

The Studio side rail: brand, global search (Ctrl K), Create, the project and chat lists, footer links and the run-usage meter. Items are links, so navigation, middle-click and screen readers behave as on any page.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowRail(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `brand` (required) | `{ label: string; href: string }` |  |
| `labels` (required) | `{` |  |
| `headTag` | `{ label: string; color: "violet" \| "lime" }` | A tag next to the brand, such as "Admin". |
| `sections` (required) | `RailSection[]` |  |
| `footer` (required) | `RailItem[]` |  |
| `usage` (required) | `{ label: string; caption: string; ratio: number; ariaLabel: string } \| null` |  |
| `selected` (required) | `string` |  |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `collapsed` | `boolean` |  |
| `slim` | `boolean` | The narrower admin rail. |
| `className` | `string` |  |

## Events

Subscribe with `component.on(name, handler)`.

| Field | Type | Notes |
| --- | --- | --- |
| `search` (required) | `(query: string) => void` |  |
| `create` (required) | `(anchor: HTMLElement) => void` |  |
| `toggle` (required) | `(collapsed: boolean) => void` |  |

## Built from

`XWUIButton`, `XWUIIcon`, `XWUIInputText`, `XWUIKbd`, `XWUIProgressBar`, `XWUITag`, `XWFlowBrand`, `XWFlowStatus`.

## Files

- `XWFlowRail.css`
- `XWFlowRail.logic.ts`
- `XWFlowRail.md`
- `XWFlowRail.schema.json`
- `XWFlowRail.ts`
- `XWFlowRail.types.ts`
- `XWFlowRail.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowrail`, so the base class does not request them from the CDN.
