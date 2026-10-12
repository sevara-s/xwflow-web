# Extending XWflow

How to add a page, an API operation, an XWFlow component, or a layout or decoration preset. Each recipe lists every file to touch, and the checks that fail if one is missed. The Agents page (`/studio/agents`) is the worked example throughout.

Before committing, `npm run check` (typecheck, lint, unit tests with coverage, build) and `npm run e2e` must pass.

## Add a page

1. **Route** in `src/app/router.ts`:
   - add a member to the `Route` union, with any query it reads (Agents: `{ zone: "studio"; page: "agents"; q: string; status: AgentStatus | "" }`);
   - add its address to `paths` (`agents: "/studio/agents"`);
   - parse it in `parseLocation`, checking query values with `oneOf()` so a bad address falls back to defaults;
   - add a case to `tests/router.test.ts`.
2. **Words** in `src/content/<area>.ts`, reached through `catalog` (`src/content/catalog.ts`). Pages show no literal text, so all wording sits in one place per area.
3. **The page** in `src/pages/<zone>/<name>.ts`. It exports `view(context)` and returns XWUI nodes built with the kit (`src/ui/kit.ts`) and, where XWUI has no component, `xwflow()`.
   - Data comes only from `api` (`src/api/client.ts`), never from sample data.
   - Narrow the route with `Extract<Route, { page: "agents" }>` and keep filters in the address with `replaceQuery()`, so a reload or a shared link shows the same list.
   - Use `pageHead()` (studio and admin) or `projectHead()` (project areas) so headings stay h1, then h2 for sections, then h3 for cards.
4. **Load it** in the `pages` table in `src/app/app.ts`, keyed `"<zone>/<page>"`. Each page is its own chunk.
5. **Navigation**: a rail item in `src/app/shells/studio-view.ts` or `admin-view.ts` (and its `railSelection` case), a tab in `projectTabs` (`src/content/project.ts`), or, for the website, a target in `src/app/site-links.ts` and its header link.
6. **Tests**: add the address to `e2e/routes.ts`, so the accessibility check (axe) and the 390 px overflow check run on it. Add a spec in `e2e/<zone>.spec.ts` for each thing it does, such as filtering, creating or deleting.

What catches a miss: the guard test (`tests/xwui-only.test.ts`) requires `view()`, XWUI nodes only, and no colour, type size, spacing or layout numbers; an address without a loader shows the not-found notice, which the route specs catch.

## Add an API operation

1. Write it in the domain module in `src/api/modules/` (Agents: `listAgents` in `project.js`), from the helpers in `src/api/core.js`:
   - `await read()` before a read, `await write()` before a change, so it gets the configured latency and simulated failures;
   - return `clone()`d data, never the store itself;
   - throw `notFound()`, `invalid()` or `consoleError(code, message)` with a message a person can read;
   - call `save()` after a change, and `logAudit()` for admin actions.
2. Seed any new data in `src/api/data/<area>.js`. If a stored session predates it, fill it in `load()` in `core.js` (as `stored.project ??= …` does).
3. Declare it in `src/api/dummy-api.d.ts`, with its types in `src/types/domain.ts`. `dummy-api.js` re-exports every module, so pages see it as `api.<name>` with no other change.
4. Test it in `tests/<area>-api.test.ts`: the result, the errors, and that a failed write (`configureApi({ failureRate: 1 })`) changes nothing.

## Add an XWFlow component

Only when no published XWUI component fits; check xwui.dev first and record any library defect in `docs/xwui-issues.md`.

1. Create `src/components/<name>/` with XWUI's split, all named `XWFlow<Name>`:
   - `.types.ts` (data, config, events; no DOM)
   - `.json` (schema)
   - `.logic.ts` (state, extending `XWUIComponentLogic`)
   - `.view.ts` (a pure projector built with `h()`)
   - `.css` (classes `xwflow-<name>`, colours from theme tokens)
   - the adapter `XWFlow<Name>.ts`, extending `XWUIComponent`
   - `.md` (the docs page)
   - `.examples.ts`
2. Register it in `src/components/index.ts`, both in the kit's table for `xwflow("<name>")` and as `<xwflow-<name>>` with `createXWUIElement`.
3. Test the view and the logic in `tests/xwflow-components.test.ts`, render every example, and cover the page that uses it in e2e.

The guard test requires all eight files, the published base classes, the `XWFlow` name and `xwflow-` tags only.

## Add a layout or decoration preset

- Grid card widths, column splits, page and text widths, and breakpoints live in `src/ui/layout.ts`. Add a named entry; pages use the name (`grid(cards, "card")`, `columns.twoOne`, `measure(child, "search")`, `breakpoints.phone`).
- Decorative glows live in `src/ui/decor.ts`; a page places one with `decoration("<area>.<name>")`.
- Spacing is a step of the theme scale (`"s"`, `"m"`, `"xl"`, through `space()` and `sides()`); colours and type come from the xwflow theme in `public/theme/xwflow/`.

The guard test refuses the raw numbers in pages, shells and the kit.
