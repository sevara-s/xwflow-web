# xwflow front end

A working front end for the xwflow prototype (22 boards: website, studio, admin and system, notation views). An organization defines a flow, publishes a version, runs it, and reads a receipt of every step attempt.

## Setup

```bash
npm install
npm run dev        # http://127.0.0.1:4173
npm test           # Vitest
npm run build      # typecheck + production build in dist/
```

XWUI loads from the CDN (`https://xwui.dev/esm/basic.bundle.js` and the dark preset). The only npm packages are dev tools: TypeScript, Vite and Vitest.

## Routes

| Zone | Routes |
| --- | --- |
| Website | `#/`, `#/integrations`, `#/pricing`, `#/self-host`, `#/notations` |
| Studio | `#/studio` (assistant), `#/studio/flows`, `#/studio/flows/:id` (editor), `#/studio/runs`, `#/studio/runs/:id` (receipt), `#/studio/connections` |
| Views | `#/studio/flows/:id/{flowchart,swimlane,bpmn,sequence,sim,3d}` |
| Admin, system | `#/admin`, `#/admin/branding`, `#/admin/audit`, `#/system/health`, `#/denied` |

## Architecture

| Piece | Role |
| --- | --- |
| `src/api/dummy-api.js` | The local dummy API: async operations with simulated latency, a small run engine, session persistence. |
| `src/api/data/*.js` | Sample data (studio, site, admin). Times are offsets from load time. |
| `src/api/client.ts` | The only data boundary pages import. |
| `src/content/*.ts` | Every visible string. Pages hold no copy. |
| `src/styles/theme.css` | The prototype's "Neon Depth" look as XWUI tokens on custom axes (`data-brand="xwflow"`, `data-accent="lime"`, `data-roundness="pill"`, `data-font="manrope"`). |
| `src/styles/xwui-skin.css` | Surface treatments no token expresses, applied through XWUI `className` options and scoped tokens. |
| `src/components/XWFlow*` | Custom components extending `XWUIComponent`, split into types, logic, view and CSS. Their CSS is registered under XWUI's `xwui-css-<name>` id, so the base class does not fetch it. |
| `src/components/XWFlow*/*.md`, `*.schema.json` | Each custom component's doc and JSON schema (`data` and `conf_comp`), as XWUI publishes for its own components. A test keeps every component to this file convention. |
| `src/pages/**` | Screens composed from XWUI and XWFlow components. |
| `src/app/*` | Router, shells, formatting (Intl), status mapping, contrast, simulation, exporters. |

XWUI components in use include Button, ButtonCopy, InputText, InputTextarea, Select, InputSwitch, InputSlider, SegmentedControl, NavTabs, Table, DisplayStatistic, DisplayChip, Tag, Kbd, Avatar, Icon, ProgressBar, CodeBlock, Dialog, Toast, MenuDropdown, Empty, Alert, UptimeBar, BarSiteHeader and BarSiteFooter.

## Assumptions

- No sign-in. The current user is "You" with the Builder role, so Quotas shows the denied state.
- Data that the prototype shows as a placeholder (prices, start commands, dialect depth) stays a visible placeholder.
- Admin rail items with no board open the closest real screen.
- The runs engine, simulation and health checks are simulated in the browser.

## Incomplete

- Agents, Tables, Forms, Variables, MCP servers, Templates and Versions are not part of the prototype and show a notice.
- Uploads, saving the brand kit and SIEM streaming are gated to the Commercial plan, as the prototype shows.
- `XWUIUptimeBar` draws at most 14 days, so health shows the last 14 days rather than 30.
- Dialogs open on an animation frame. They were verified with a scripted click, because the automation tab reported itself hidden.
