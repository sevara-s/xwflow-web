import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill, formatDay } from "../../app/format";
import type { MountScope } from "../../app/mount";
import { errorMessage, notify } from "../../app/notify";
import type { PageContext } from "../../app/page";
import { href, navigate, paths, replaceQuery, type Route } from "../../app/router";
import { flowStatusView, lastRunView, nextRunLabel } from "../../app/status";
import { debounce } from "../../app/timing";
import { XWFlowChain } from "../../components/XWFlowChain/XWFlowChain";
import { XWFlowKpi } from "../../components/XWFlowKpi/XWFlowKpi";
import { XWFlowShape } from "../../components/XWFlowShape/XWFlowShape";
import { XWFlowStatus } from "../../components/XWFlowStatus/XWFlowStatus";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { FlowList, FlowQuery, FlowSummary } from "../../types/domain";
import { XWUIAvatar, XWUIButton, XWUIEmpty, XWUIInputText, XWUIMenuDropdown, XWUISelect, XWUITable } from "../../xwui";
import { glass, heading, mountAppBar, mountProjectTabs, mountTag } from "./common";
import "./flows.css";

type FlowsRoute = Extract<Route, { page: "flows" }>;

const words = catalog.studio.flows;

export async function render(context: PageContext<FlowsRoute>): Promise<void> {
  const { route, scope, body, workspace } = context;
  const query: FlowQuery = { q: route.q, status: route.status, folder: route.folder };
  const initial = await api.listFlows(query);

  mountAppBar(context, [
    { label: catalog.studio.topbar.studio, href: href(paths.studio) },
    { label: workspace.project.name },
  ]);

  renderHero(body, scope, context, initial);

  const kpis = el("div", "xwflow-grid");
  kpis.style.setProperty("--xwflow-min", "200px");
  body.append(kpis);
  const counts = initial.counts;
  scope.track(new XWFlowKpi(slot(kpis), { label: words.kpis.published, value: counts.published }, { tone: "lime" }));
  scope.track(new XWFlowKpi(slot(kpis), { label: words.kpis.running, value: counts.running }, { tone: "cyan" }));
  scope.track(new XWFlowKpi(slot(kpis), { label: words.kpis.failed24h, value: counts.failed24h }, { tone: "red", emphasis: counts.failed24h > 0 }));
  scope.track(new XWFlowKpi(slot(kpis), { label: words.kpis.drafts, value: counts.drafts }, { tone: "amber" }));

  mountProjectTabs(slot(body), scope, "flows");

  const toolbar = el("div", "xwflow-toolbar");
  body.append(toolbar);
  const tableHost = el("div", "xwflow-table");
  const footer = el("p", "xwflow-small xwflow-sec");
  body.append(tableHost, footer);

  let tableScope: { destroy(): void }[] = [];
  const showFlows = (list: FlowList): void => {
    for (const item of tableScope.splice(0)) item.destroy();
    tableHost.replaceChildren();
    if (!list.flows.length) {
      tableScope.push(new XWUIEmpty(tableHost, { icon: "search", title: words.empty.title, description: words.empty.description }));
    } else {
      tableScope.push(mountFlowTable(tableHost, list.flows, scope));
    }
    footer.textContent = list.flows.length === 1 ? words.footerOne : fill(words.footer, { n: list.flows.length });
  };
  scope.track({ destroy: () => tableScope.splice(0).forEach((item) => item.destroy()) });

  const apply = async (): Promise<void> => {
    replaceQuery(paths.flows, { q: query.q, status: query.status, folder: query.folder });
    try {
      showFlows(await api.listFlows(query));
    } catch (error) {
      notify(errorMessage(error, catalog.errors.load), "danger");
    }
  };

  const search = scope.track(
    new XWUIInputText(slot(toolbar, "xwflow-toolbar__search"), { value: query.q ?? "", placeholder: words.search }, {
      type: "search",
      leadingIcon: "search",
      ariaLabel: words.search,
      fullWidth: true,
      clearable: true,
    }),
  );
  search.onChange(
    debounce((value: string) => {
      query.q = value.trim();
      void apply();
    }, config.searchDebounceMs),
  );

  const status = scope.track(
    new XWUISelect(
      slot(toolbar, "xwflow-toolbar__select"),
      {
        value: query.status ?? "",
        placeholder: words.anyStatus,
        options: [
          { value: "", label: words.anyStatus },
          ...(["published", "changed", "draft"] as const).map((value) => ({ value, label: catalog.studio.flowStatus[value] })),
        ],
      },
      { ariaLabel: words.statusLabel },
    ),
  );
  status.onChange((value) => {
    query.status = String(value) as FlowQuery["status"];
    void apply();
  });

  const folder = scope.track(
    new XWUISelect(
      slot(toolbar, "xwflow-toolbar__select"),
      {
        value: query.folder ?? "",
        placeholder: words.allFolders,
        options: [{ value: "", label: words.allFolders }, ...initial.folders.map((name) => ({ value: name, label: name }))],
      },
      { ariaLabel: words.folderLabel },
    ),
  );
  folder.onChange((value) => {
    query.folder = String(value);
    void apply();
  });

  showFlows(initial);
}

function renderHero(body: HTMLElement, scope: MountScope, context: PageContext, list: FlowList): void {
  const { workspace } = context;
  const hero = glass(body, { className: "xwflow-project-hero xwflow-clip" });
  scope.track(new XWFlowShape(slot(hero), { kind: "halo" }, { size: 260, color: "violet", place: { right: "-40px", top: "-120px" } }));
  scope.track(new XWFlowShape(slot(hero), { kind: "cube" }, { size: 56, color: "lime", place: { right: "250px", top: "26px" } }));

  const row = el("div", "xwflow-project-hero__row");
  hero.append(row);
  row.append(el("span", "xwflow-project-hero__tile"));

  const text = el("div", "xwflow-stack xwflow-gap-4 xwflow-grow");
  const titleRow = el("div", "xwflow-row xwflow-gap-12");
  heading(titleRow, 1, "h2", workspace.project.name);
  mountTag(slot(titleRow), scope, { label: catalog.studio.visibility[workspace.project.visibility], color: "plain" });
  text.append(titleRow, el("p", "xwflow-sec", workspace.project.description));
  row.append(text);

  const actions = el("div", "xwflow-row xwflow-gap-8 xwflow-wrap");
  row.append(actions);

  const demo = scope.track(
    new XWUIButton(slot(actions), { text: words.liveDemo }, { variant: "ghost", icon: "zap", className: "xwflow-btn-gradient" }),
  );
  demo.onClick(async () => {
    const target = list.flows.find((flow) => flow.status === "published") ?? list.flows[0];
    if (!target) return;
    try {
      const run = await api.startRun(target.id, "test");
      notify(fill(words.runStarted, { name: target.name }), "success");
      navigate(paths.run(run.id));
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  });

  const createHost = slot(actions);
  const create = scope.track(
    new XWUIButton(createHost, { text: words.createFlow }, { variant: "primary", icon: "plus" }),
  );
  const menu = scope.track(
    new XWUIMenuDropdown(slot(createHost), {
      items: words.createMenu.map((item) => ({ id: item.id, label: item.label })),
      triggerElement: createHost.querySelector("button"),
    }, { trigger: "click", align: "end" }),
  );
  create.onClick(() => undefined);
  menu.onItemClick(async (item) => {
    if (item.id === "assistant") {
      navigate(paths.studio);
      return;
    }
    try {
      const flow = await api.createFlow({ name: words.newFlowName, folder: workspace.project.name });
      notify(fill(words.created, { name: flow.name }), "success");
      navigate(paths.flow(flow.id));
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  });
}

function mountFlowTable(host: HTMLElement, flows: FlowSummary[], pageScope: MountScope): { destroy(): void } {
  const owned: { destroy(): void }[] = [];
  const keep = <T extends { destroy(): void }>(item: T): T => {
    owned.push(item);
    return item;
  };
  const cell = (className?: string): HTMLElement => el("div", className);

  const rows = flows.map((flow) => ({ ...flow, key: flow.id }));
  const table = new XWUITable(
    host,
    {
      columns: [
        {
          key: "name",
          title: words.columns.name,
          render: (_: unknown, flow: FlowSummary) => {
            const box = cell("xwflow-cell-name");
            const link = el("a", "xwflow-cell-link", flow.name);
            link.href = href(paths.flow(flow.id));
            box.append(link, el("div", "xwflow-xs xwflow-sec", flow.folder));
            return box;
          },
        },
        {
          key: "chain",
          title: words.columns.steps,
          render: (_: unknown, flow: FlowSummary) => {
            const box = cell();
            keep(new XWFlowChain(box, { groups: flow.chain, label: `${flow.chain.length}` }));
            return box;
          },
        },
        {
          key: "status",
          title: words.columns.status,
          render: (_: unknown, flow: FlowSummary) => {
            const box = cell();
            const view = flowStatusView(flow.status);
            keep(new XWFlowStatus(box, view));
            return box;
          },
        },
        {
          key: "lastRun",
          title: words.columns.lastRun,
          render: (_: unknown, flow: FlowSummary) => {
            const box = cell();
            const view = lastRunView(flow.lastRun);
            if (view) keep(new XWFlowStatus(box, view));
            else box.append(el("span", "xwflow-ter", words.notRecorded));
            return box;
          },
        },
        {
          key: "nextRun",
          title: words.columns.nextRun,
          render: (_: unknown, flow: FlowSummary) => el("span", "xwflow-sec", nextRunLabel(flow)),
        },
        {
          key: "owner",
          title: words.columns.owner,
          render: (_: unknown, flow: FlowSummary) => {
            const box = cell("xwflow-row xwflow-gap-8 xwflow-cell-owner");
            const avatar = el("span", "xwflow-avatar");
            box.append(avatar, el("span", undefined, flow.owner.name));
            keep(new XWUIAvatar(avatar, { name: flow.owner.name }, { size: "small", decorative: true }));
            return box;
          },
        },
        {
          key: "updatedAt",
          title: words.columns.updated,
          render: (_: unknown, flow: FlowSummary) => el("span", "xwflow-sec", formatDay(flow.updatedAt)),
        },
        {
          key: "actions",
          title: "",
          ariaLabel: words.actions,
          align: "end",
          render: (_: unknown, flow: FlowSummary) => {
            const box = cell("xwflow-cell-actions");
            const button = keep(new XWUIButton(box, { text: words.actions }, { variant: "ghost", size: "sm", className: "xwflow-btn-glass" }));
            const menu = keep(
              new XWUIMenuDropdown(slot(box), {
                items: words.rowActions.map((item) => ({ id: item.id, label: item.label })),
                triggerElement: box.querySelector("button"),
              }, { trigger: "click", align: "end" }),
            );
            button.onClick(() => undefined);
            menu.onItemClick(async (item) => {
              if (item.id === "open") navigate(paths.flow(flow.id));
              if (item.id === "runs") navigate(paths.runs, { q: flow.name });
              if (item.id === "run") {
                try {
                  const run = await api.startRun(flow.id, "test");
                  notify(fill(words.runStarted, { name: flow.name }), "success");
                  navigate(paths.run(run.id));
                } catch (error) {
                  notify(errorMessage(error), "danger");
                }
              }
            });
            return box;
          },
        },
      ],
      data: rows,
    },
    { selectable: true, hoverable: true, bordered: false, ariaLabel: words.tableLabel },
  );
  owned.push(table);
  void pageScope;
  return { destroy: () => owned.splice(0).forEach((item) => item.destroy()) };
}
