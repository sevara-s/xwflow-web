import { api } from "../../api/client";
import { fill, formatDay } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { href, navigate, paths, replaceQuery, type Route } from "../../app/router";
import { flowStatusView, lastRunView, nextRunLabel } from "../../app/status";
import { debounce } from "../../app/timing";
import type { PageResult, ViewContext } from "../../app/view";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { FlowList, FlowQuery, FlowSummary, Workspace } from "../../types/domain";
import { hueOf, toneOf } from "../../ui/flow";
import { button, cell, decoration, glass, grid, row, space, stack, status, tag, text, type Node } from "../../ui/kit";
import { breakpoints } from "../../ui/layout";
import type { XWUIComposer } from "../../xwui";
import { projectTabs } from "./common-view";

type FlowsRoute = Extract<Route, { page: "flows" }>;

const words = catalog.studio.flows;

async function runNow(flow: FlowSummary): Promise<void> {
  try {
    const run = await api.startRun(flow.id, "test");
    notify(fill(words.runStarted, { name: flow.name }), "success");
    navigate(paths.run(run.id));
  } catch (error) {
    notify(errorMessage(error), "danger");
  }
}

/** A button that opens an XWUI dropdown menu. */
function menuButton(trigger: Node, items: Array<{ id: string; label: string }>, onPick: (id: string) => void): Node {
  return {
    tag: "xwui-dropdown-menu",
    data: { items },
    config: { trigger: "click", align: "end" },
    slots: { triggerElement: trigger },
    ref: (instance) => (instance as { onItemClick(handler: (item: { id: string }) => void): void }).onItemClick((item) => onPick(item.id)),
  };
}

function hero(workspace: Workspace, list: FlowList): Node {
  const demo = button("gradient", words.liveDemo, {
    icon: "zap",
    onClick: () => {
      const target = list.flows.find((flow) => flow.status === "published") ?? list.flows[0];
      if (target) void runNow(target);
    },
  });
  const create = menuButton(
    button("primary", words.createFlow, { icon: "plus" }),
    words.createMenu.map((item) => ({ id: item.id, label: item.label })),
    async (id) => {
      if (id === "assistant") return navigate(paths.studio);
      try {
        const flow = await api.createFlow({ name: words.newFlowName, folder: workspace.project.name });
        notify(fill(words.created, { name: flow.name }), "success");
        navigate(paths.flow(flow.id));
      } catch (error) {
        notify(errorMessage(error), "danger");
      }
    },
  );
  return {
    tag: "xwui-box",
    config: { surface: "glass", padding: space("xxl"), overflow: "clip" },
    slots: {
      children: stack(
        [
          decoration("flows.halo"),
          // On a phone the title fills the card, so the cube would sit on the folder tile.
          ...(window.matchMedia(breakpoints.phone).matches ? [] : [decoration("flows.cube")]),
          row(
            [
              row(
                [
                  { tag: "xwui-icon-tile", data: { icon: "folder" }, config: { hue: "violet", size: "lg" } },
                  stack(
                    [
                      row([text("h2", workspace.project.name, { level: 1 }), tag(catalog.studio.visibility[workspace.project.visibility])], { gap: "m", wrap: true }),
                      text("body", workspace.project.description, { tone: "secondary" }),
                    ],
                    { gap: "xs" },
                  ),
                ],
                { gap: "xl", wrap: true },
              ),
              row([demo, create], { gap: "s", wrap: true }),
            ],
            { gap: "xl", wrap: true, justify: "space-between" },
          ),
        ],
        { gap: "none" },
      ),
    },
  };
}

function table(flows: FlowSummary[]): Node {
  if (!flows.length) return { tag: "xwui-empty", data: { icon: "search", title: words.empty.title, description: words.empty.description } };
  return glass(
    {
      tag: "xwui-table",
      data: {
        columns: [
          {
            key: "name",
            title: words.columns.name,
            render: (_: unknown, flow: FlowSummary) =>
              cell(stack([{ ...text("small", flow.name, { bold: true }), on: { click: () => navigate(paths.flow(flow.id)) } }, text("xs", flow.folder, { tone: "secondary" })], { gap: "xs" })),
          },
          {
            key: "chain",
            title: words.columns.steps,
            render: (_: unknown, flow: FlowSummary) => cell({ tag: "xwui-step-chain", data: { steps: flow.chain.map((group) => hueOf[group]), label: `${flow.chain.length}` } }),
          },
          {
            key: "status",
            title: words.columns.status,
            render: (_: unknown, flow: FlowSummary) => {
              const view = flowStatusView(flow.status);
              return cell(status(toneOf[view.tone], view.label));
            },
          },
          {
            key: "lastRun",
            title: words.columns.lastRun,
            render: (_: unknown, flow: FlowSummary) => {
              const view = lastRunView(flow.lastRun);
              return cell(view ? status(toneOf[view.tone], view.label) : text("small", words.notRecorded, { tone: "tertiary" }));
            },
          },
          { key: "nextRun", title: words.columns.nextRun, render: (_: unknown, flow: FlowSummary) => cell(text("small", nextRunLabel(flow), { tone: "secondary" })) },
          {
            key: "owner",
            title: words.columns.owner,
            render: (_: unknown, flow: FlowSummary) => cell(row([{ tag: "xwui-avatar", data: { name: flow.owner.name }, config: { size: "small", decorative: true } }, text("small", flow.owner.name)])),
          },
          { key: "updatedAt", title: words.columns.updated, render: (_: unknown, flow: FlowSummary) => cell(text("small", formatDay(flow.updatedAt), { tone: "secondary" })) },
          {
            key: "actions",
            title: "",
            ariaLabel: words.actions,
            align: "end",
            render: (_: unknown, flow: FlowSummary) =>
              cell(
                menuButton(button("glass", words.actions, { size: "sm" }), words.rowActions.map((item) => ({ id: item.id, label: item.label })), (id) => {
                  if (id === "open") navigate(paths.flow(flow.id));
                  if (id === "runs") navigate(paths.runs, { q: flow.name });
                  if (id === "run") void runNow(flow);
                }),
              ),
          },
        ],
        data: flows.map((flow) => ({ ...flow, key: flow.id })),
      },
      config: { selectable: true, hoverable: true, bordered: false, ariaLabel: words.tableLabel },
    },
    { pad: "none", scroll: true },
  );
}

function results(list: FlowList): Node {
  return stack([table(list.flows), text("small", list.flows.length === 1 ? words.footerOne : fill(words.footer, { n: list.flows.length }), { tone: "secondary" })], { gap: "m" });
}

export async function view(context: ViewContext<FlowsRoute>): Promise<PageResult> {
  const { route, workspace } = context;
  const query: FlowQuery = { q: route.q, status: route.status, folder: route.folder };
  const initial = await api.listFlows(query);

  const apply = async (): Promise<void> => {
    replaceQuery(paths.flows, { q: query.q, status: query.status, folder: query.folder });
    try {
      context.instance<XWUIComposer>("flow-results")?.setTree(results(await api.listFlows(query)));
    } catch (error) {
      notify(errorMessage(error, catalog.errors.load), "danger");
    }
  };

  const counts = initial.counts;
  const kpi = (label: string, value: number, hue: string, emphasis = false): Node => ({ tag: "xwui-kpi-card", data: { label, value }, config: { hue, emphasis } });

  const toolbar = row(
    [
      {
        tag: "xwui-box",
        config: { width: "100%" },
        slots: {
          children: {
            tag: "xwui-input-text",
            data: { value: query.q ?? "", placeholder: words.search },
            config: { type: "search", leadingIcon: "search", ariaLabel: words.search, fullWidth: true, clearable: true },
            ref: (instance) =>
              (instance as { onChange(handler: (value: string) => void): void }).onChange(
                debounce((value: string) => {
                  query.q = value.trim();
                  void apply();
                }, config.searchDebounceMs),
              ),
          },
        },
      },
      {
        tag: "xwui-select",
        data: {
          value: query.status ?? "",
          placeholder: words.anyStatus,
          options: [{ value: "", label: words.anyStatus }, ...(["published", "changed", "draft"] as const).map((value) => ({ value, label: catalog.studio.flowStatus[value] }))],
        },
        config: { ariaLabel: words.statusLabel },
        ref: (instance) =>
          (instance as { onChange(handler: (value: unknown) => void): void }).onChange((value) => {
            query.status = String(value) as FlowQuery["status"];
            void apply();
          }),
      },
      {
        tag: "xwui-select",
        data: {
          value: query.folder ?? "",
          placeholder: words.allFolders,
          options: [{ value: "", label: words.allFolders }, ...initial.folders.map((name) => ({ value: name, label: name }))],
        },
        config: { ariaLabel: words.folderLabel },
        ref: (instance) =>
          (instance as { onChange(handler: (value: unknown) => void): void }).onChange((value) => {
            query.folder = String(value);
            void apply();
          }),
      },
    ],
    { gap: "m" },
  );

  return {
    bar: { crumbs: [{ label: catalog.studio.topbar.studio, href: href(paths.studio) }, { label: workspace.project.name }] },
    body: [
      hero(workspace, initial),
      grid(
        [
          kpi(words.kpis.published, counts.published, "lime"),
          kpi(words.kpis.running, counts.running, "cyan"),
          kpi(words.kpis.failed24h, counts.failed24h, "red", counts.failed24h > 0),
          kpi(words.kpis.drafts, counts.drafts, "amber"),
        ],
        "kpi",
      ),
      projectTabs("flows"),
      toolbar,
      { tag: "xwui-composer", key: "flow-results", data: { tree: results(initial) } },
    ],
  };
}


