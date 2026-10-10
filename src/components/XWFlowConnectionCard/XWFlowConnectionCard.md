# XWFlowConnectionCard

A stored credential. It shows who owns it, what it may do, its health and a masked value with no reveal control: secrets stay in the vault.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowConnectionCard(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `name` (required) | `string` |  |
| `subtitle` (required) | `string` | "OAuth, owned by You" |
| `icon` (required) | `string` |  |
| `group` (required) | `StepGroup` |  |
| `status` (required) | `{ tone: StatusTone; label: string }` |  |
| `mask` (required) | `string` | The masked value. The real secret never reaches the browser. |
| `maskLabel` (required) | `string` |  |
| `note` (required) | `{ text: string; emphasis?: string; muted: boolean }` | Body text; `emphasis` is drawn bold where it appears in `text`. |
| `tags` (required) | `string[]` |  |
| `action` (required) | `{ label: string; primary: boolean }` |  |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `className` | `string` |  |

## Events

Subscribe with `component.on(name, handler)`.

| Field | Type | Notes |
| --- | --- | --- |
| `action` (required) | `() => Promise<void> \| void` |  |

## Built from

`XWUIButton`, `XWUITag`, `XWFlowGroups`, `XWFlowStatus`, `XWFlowStepIcon`.

## Files

- `XWFlowConnectionCard.css`
- `XWFlowConnectionCard.logic.ts`
- `XWFlowConnectionCard.md`
- `XWFlowConnectionCard.schema.json`
- `XWFlowConnectionCard.ts`
- `XWFlowConnectionCard.types.ts`
- `XWFlowConnectionCard.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowconnectioncard`, so the base class does not request them from the CDN.
