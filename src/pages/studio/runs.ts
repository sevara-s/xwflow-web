import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill, formatAgo, formatMs, formatStamp } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import type { PageContext } from "../../app/page";
import { href, paths, replaceQuery, type Route } from "../../app/router";
import { runModeTag, runStatusView } from "../../app/status";
import { debounce } from "../../app/timing";
import { XWFlowKpi } from "../../components/XWFlowKpi/XWFlowKpi";
import { XWFlowSparkBars } from "../../components/XWFlowSparkBars/XWFlowSparkBars";
import { XWFlowStatus } from "../../components/XWFlowStatus/XWFlowStatus";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { RunList, RunMode, RunQuery, RunStatus, RunSummary } from "../../types/domain";
import { XWUIButton, XWUIDisplayChip, XWUIEmpty, XWUIInputText, XWUISelect, XWUITable } from "../../xwui";
import { glass, heading, mountAppBar, mountProjectTabs, mountTag, projectCrumb } from "./common";
import "./runs.css";

type RunsRoute = Extract<Route, { page: "runs" }>;
type Owned = { destroy(): void };

const words = catalog.studio.runs;
const RANGE_DAYS = 7;

export async function render(context: PageContext<RunsRoute>): Promise<void> {
  const { route, scope, body } = context;
  const query: RunQuery = { q: route.q, status: route.status, mode: route.mode, days: route.range === "7d" ? RANGE_DAYS : undefined };
  let list = await api.listRuns(query);
  const selected = new Set<string>();

  mountAppBar(context, [projectCrumb(context), { label: words.title }]);

  const titleRow = el("div", "xwflow-row xwflow-gap-16 xwflow-wrap");
  body.append(titleRow);
  heading(titleRow, 1, "h2", words.title);
  const tabsHost = slot(titleRow, "xwflow-push");
  mountProjectTabs(tabsHost, scope, "runs", ["flows", "agents", "tables", "connections", "runs", "mcp"]);

  /* KPIs and the per-hour sparkline */
  const stats = el("div", "xwflow-wrap xwflow-gap-16 xwflow-runs-stats");
  body.append(stats);
  const running = scope.track(new XWFlowKpi(slot(stats), kpiRunning(list), { tone: "cyan" }));
  const succeeded = scope.track(new XWFlowKpi(slot(stats), { label: words.kpis.succeeded, value: list.counts.succeeded7d }, { tone: "green" }));
  const failed = scope.track(new XWFlowKpi(slot(stats), { label: words.kpis.failed, value: list.counts.failed7d }, { tone: "red" }));
  const sparkPanel = glass(stats, { pad: "s", className: "xwflow-stack xwflow-gap-8 xwflow-runs-spark" });
  const sparkHead = el("div", "xwflow-row");
  sparkHead.append(el("span", "xwflow-xs xwflow-strong xwflow-sec xwflow-caps", words.perHour), el("span", "xwflow-xs xwflow-ter xwflow-push", words.partial));
  sparkPanel.append(sparkHead);
  const spark = scope.track(new XWFlowSparkBars(slot(sparkPanel), sparkData(list)));

  /* Filters */
  const toolbar = el("div", "xwflow-toolbar");
  body.append(toolbar);
  const search = scope.track(
    new XWUIInputText(slot(toolbar, "xwflow-toolbar__search"), { value: query.q ?? "", placeholder: words.search }, {
      type: "search",
      leadingIcon: "search",
      ariaLabel: words.searchLabel,
      fullWidth: true,
      clearable: true,
    }),
  );
  search.onChange(debounce((value: string) => apply({ q: value.trim() }), config.searchDebounceMs));

  const statuses: RunStatus[] = ["running", "succeeded", "retried", "failed"];
  const status = scope.track(
    new XWUISelect(
      slot(toolbar, "xwflow-toolbar__select"),
      {
        value: query.status ?? "",
        placeholder: words.anyStatus,
        options: [{ value: "", label: words.anyStatus }, ...statuses.map((value) => ({ value, label: catalog.studio.runStatus[value] }))],
      },
      { ariaLabel: words.statusLabel },
    ),
  );
  status.onChange((value) => apply({ status: String(value) as RunStatus | "" }));

  const modes: RunMode[] = ["production", "test", "retry", "replay"];
  const mode = scope.track(
    new XWUISelect(
      slot(toolbar, "xwflow-toolbar__select"),
      {
        value: query.mode ?? "",
        placeholder: words.anyMode,
        options: [{ value: "", label: words.anyMode }, ...modes.map((value) => ({ value, label: catalog.studio.runMode[value] }))],
      },
      { ariaLabel: words.modeLabel },
    ),
  );
  mode.onChange((value) => apply({ mode: String(value) as RunMode | "" }));

  if (query.days) {
    const chip = scope.track(
      new XWUIDisplayChip(slot(toolbar), { label: words.range }, { closable: true, className: "xwflow-chip xwflow-chip--violet" }),
    );
    chip.onClose(() => apply({ days: undefined }));
  }

  /* Selection band, table and the end-of-list note */
  const band = el("div", "xwflow-band");
  band.dataset.tone = "lime";
  band.hidden = true;
  const tableHost = el("div", "xwflow-table");
  const end = el("p", "xwflow-small xwflow-ter", words.end);
  body.append(band, tableHost, end);

  let owned: Owned[] = [];
  scope.track({ destroy: () => owned.splice(0).forEach((item) => item.destroy()) });
  let bandOwned: Owned[] = [];
  scope.track({ destroy: () => bandOwned.splice(0).forEach((item) => item.destroy()) });

  const showBand = (): void => {
    bandOwned.splice(0).forEach((item) => item.destroy());
    band.replaceChildren();
    band.hidden = selected.size === 0;
    if (!selected.size) return;
    const n = selected.size;
    band.append(el("b", undefined, n === 1 ? words.selectedOne : fill(words.selected, { n })));
    const actions = el("div", "xwflow-row xwflow-gap-8 xwflow-push");
    band.append(actions);
    const retry = new XWUIButton(slot(actions), { text: fill(words.retry, { n }) }, { variant: "primary", size: "sm", icon: "rotate-ccw" });
    const remove = new XWUIButton(slot(actions), { text: fill(words.delete, { n }) }, { variant: "ghost", size: "sm", className: "xwflow-btn-glass" });
    const clear = new XWUIButton(slot(actions), { text: words.clear }, { variant: "ghost", size: "sm" });
    retry.onClick(async () => {
      try {
        const created = await api.retryRuns([...selected]);
        notify(fill(words.retried, { n: created.length }), "success");
        selected.clear();
        await reload();
      } catch (error) {
        notify(errorMessage(error), "danger");
      }
    });
    remove.onClick(async () => {
      try {
        const result = await api.deleteRuns([...selected]);
        notify(fill(words.deleted, { n: result.deleted }), "success");
        selected.clear();
        await reload();
      } catch (error) {
        notify(errorMessage(error), "danger");
      }
    });
    clear.onClick(() => {
      selected.clear();
      showTable();
    });
    bandOwned.push(retry, remove, clear);
  };

  const showTable = (): void => {
    owned.splice(0).forEach((item) => item.destroy());
    tableHost.replaceChildren();
    end.hidden = !list.runs.length;
    if (!list.runs.length) {
      owned.push(new XWUIEmpty(tableHost, { icon: "search", title: words.empty.title, description: words.empty.description }));
      showBand();
      return;
    }
    const table = mountRunTable(tableHost, list.runs, owned);
    const indexes = list.runs.map((run, index) => (selected.has(run.id) ? index : -1)).filter((index) => index >= 0);
    if (indexes.length) table.setSelectedRows(indexes);
    table.onSelect((rows) => {
      selected.clear();
      for (const index of rows) if (list.runs[index]) selected.add(list.runs[index].id);
      showBand();
    });
    showBand();
  };

  const showCounts = (): void => {
    running.setData(kpiRunning(list));
    succeeded.setData({ label: words.kpis.succeeded, value: list.counts.succeeded7d });
    failed.setData({ label: words.kpis.failed, value: list.counts.failed7d });
    spark.setData(sparkData(list));
  };

  const reload = async (): Promise<void> => {
    list = await api.listRuns(query);
    for (const id of [...selected]) if (!list.runs.some((run) => run.id === id)) selected.delete(id);
    showCounts();
    showTable();
  };

  function apply(patch: Partial<RunQuery>): void {
    const hadRange = Boolean(query.days);
    Object.assign(query, patch);
    replaceQuery(paths.runs, {
      q: query.q,
      status: query.status,
      mode: query.mode,
      range: query.days ? null : "all",
    });
    if (hadRange && !query.days) context.refresh();
    else void reload().catch((error) => notify(errorMessage(error, catalog.errors.load), "danger"));
  }

  showTable();

  /* Keep "running now" honest while anything is in flight. */
  const timer = setInterval(() => {
    if (list.runs.some((run) => run.status === "running") || list.counts.running > 0) void reload().catch(() => undefined);
  }, config.pollMs);
  scope.track({ destroy: () => clearInterval(timer) });
}

function kpiRunning(list: RunList) {
  return { label: words.kpis.running, value: list.counts.running, note: fill(words.asOf, { when: formatAgo(list.counts.asOf) }) };
}

function sparkData(list: RunList) {
  const failing = list.counts.perHour.filter((hour) => hour.failed).length;
  return {
    bars: list.counts.perHour.map((hour) => ({ value: hour.runs, alert: hour.failed })),
    label: fill(words.perHourLabel, { n: failing }),
  };
}

function mountRunTable(host: HTMLElement, runs: RunSummary[], owned: Owned[]): XWUITable {
  const keep = <T extends Owned>(item: T): T => {
    owned.push(item);
    return item;
  };
  const table = new XWUITable(
    host,
    {
      columns: [
        {
          key: "flowName",
          title: words.columns.flow,
          render: (_: unknown, run: RunSummary) => {
            const link = el("a", "xwflow-cell-link", run.flowName);
            link.href = href(paths.run(run.id));
            return link;
          },
        },
        {
          key: "status",
          title: words.columns.status,
          render: (_: unknown, run: RunSummary) => {
            const box = el("div");
            keep(new XWFlowStatus(box, runStatusView(run.status)));
            return box;
          },
        },
        { key: "startedAt", title: words.columns.started, render: (_: unknown, run: RunSummary) => el("span", undefined, formatStamp(run.startedAt)) },
        {
          key: "durationMs",
          title: words.columns.runTime,
          align: "end",
          render: (_: unknown, run: RunSummary) =>
            run.durationMs === null
              ? el("span", "xwflow-mono xwflow-ter", catalog.studio.flows.notRecorded)
              : el("span", "xwflow-mono", formatMs(run.durationMs)),
        },
        { key: "id", title: words.columns.shortId, render: (_: unknown, run: RunSummary) => el("span", "xwflow-mono xwflow-sec", run.id) },
        {
          key: "mode",
          title: words.columns.mode,
          render: (_: unknown, run: RunSummary) => {
            const box = el("div");
            mountTag(box, { track: keep }, runModeTag(run.mode));
            return box;
          },
        },
      ],
      data: runs.map((run) => ({ ...run, key: run.id })),
    },
    { selectable: true, hoverable: true, bordered: false, ariaLabel: words.tableLabel },
  );
  owned.push(table);
  return table;
}
