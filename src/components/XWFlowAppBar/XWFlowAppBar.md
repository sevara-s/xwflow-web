# XWFlowAppBar

The Studio page header: breadcrumbs, page actions and the account.

Extends `XWUIComponent`. Mount it like any XWUI component: `new XWFlowAppBar(container, data, conf_comp)`.

## Data

| Field | Type | Notes |
| --- | --- | --- |
| `crumbs` (required) | `Crumb[]` |  |
| `meta` | `string` | Mono text after the crumbs, such as a run's short ID. |
| `sampleTag` | `string` | A dashed "sample" tag that marks illustrative data. |
| `tags` | `Array<{ label: string; color: "plain" \| "lime" \| "violet" }>` | Extra context tags, such as the tenant or the plan. |
| `hideAccount` | `boolean` | Hide the avatar, for screens that show the plan instead. |
| `accountLabel` (required) | `string` |  |
| `accountName` (required) | `string` |  |

## Configuration (conf_comp)

| Field | Type | Notes |
| --- | --- | --- |
| `className` | `string` |  |

## Built from

`XWUIAvatar`, `XWUITag`.

## Files

- `XWFlowAppBar.css`
- `XWFlowAppBar.md`
- `XWFlowAppBar.schema.json`
- `XWFlowAppBar.ts`
- `XWFlowAppBar.types.ts`
- `XWFlowAppBar.view.ts`

Styles are bundled with the app and registered under `xwui-css-xwflowappbar`, so the base class does not request them from the CDN.
