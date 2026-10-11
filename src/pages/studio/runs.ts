import { api } from "../../api/client";
import { fill, formatAgo, formatMs, formatStamp } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { href, navigate, paths, replaceQuery, type Route } from "../../app/router";
import { runModeTag, runStatusView } from "../../app/status";
import { debounce } from "../../app/timing";
import type { PageResult, ViewContext } from "../../app/view";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { RunList, RunMode, RunQuery, RunStatus, RunSummary } from "../../types/domain";
import { toneOf } from "../../ui/flow";
import { button, cell, glass, row, stack, status, tag, text, type Hue, type Node } from "../../ui/kit";
import type { XWUIComposer } from "../../xwui";
import { projectTabs } from "./common-view";

type RunsRoute = Extract<Route, { page: "runs" }>;

const words = catalog.studio.runs;
const RANGE_DAYS = 7;

interface Table {
  onSelect(handler: (rows: number[]) => void): void;
  setSelectedRows(rows: number[]): void;
}

function kpis(list: RunList): Node {
  const failing = list.counts.perHour.filter((hour) => hour.failed).length;
  const kpi = (label: string, value: number, hue: string, note?: string): Node => ({ tag: "xwui-kpi-card", data: { label, value, note }, config: { hue } });
  return row(
    [
      kpi(words.kpis.running, list.counts.running, "cyan", fill(words.asOf, { when: formatAgo(list.counts.asOf) })),
      kpi(words.kpis.succeeded, list.counts.succeeded7d, "green"),
      kpi(words.kpis.failed, list.counts.failed7d, "red"),
      glass(
        stack(
          [
            row([text("xs", words.perHour, { bold: true, caps: true, tone: "secondary" }), text("xs", words.partial, { tone: "tertiary" })], { justify: "space-between" }),
            {
              tag: "xwui-spark-bars",
              data: { bars: list.counts.perHour.map((hour) => ({ value: hour.runs, alert: hour.failed })), label: fill(words.perHourLabel, { n: failing }) },
            },
          ],
          { gap: 8 },
        ),
        { pad: "s" },
      ),
    ],
    { gap: 16, wrap: true, align: "stretch" },
  );
}

function runTable(runs: RunSummary[]): Node {
  return {
    tag: "xwui-table",
    key: "runs-table",
    data: {
      columns: [
        {
          key: "flowName",
          title: words.columns.flow,
          render: (_: unknown, run: RunSummary) => cell({ ...text("small", run.flowName, { bold: true }), on: { click: () => navigate(paths.run(run.id)) } }),
        },
        {
          key: "status",
          title: words.columns.status,
          render: (_: unknown, run: RunSummary) => {
            const view = runStatusView(run.status);
            return cell(status(toneOf[view.tone], view.label));
          },
        },
        { key: "startedAt", title: words.columns.started, render: (_: unknown, run: RunSummary) => cell(text("small", formatStamp(run.startedAt))) },
        {
          key: "durationMs",
          title: words.columns.runTime,
          align: "end",
          render: (_: unknown, run: RunSummary) =>
            cell(
              run.durationMs === null
                ? text("small", catalog.studio.flows.notRecorded, { mono: true, tone: "tertiary" })
                : text("small", formatMs(run.durationMs), { mono: true }),
            ),
        },
        { key: "id", title: words.columns.shortId, render: (_: unknown, run: RunSummary) => cell(text("small", run.id, { mono: true, tone: "secondary" })) },
        {
          key: "mode",
          title: words.columns.mode,
          render: (_: unknown, run: RunSummary) => {
            const view = runModeTag(run.mode);
            return cell(tag(view.label, view.color === "plain" ? undefined : (view.color as Hue)));
          },
        },
      ],
      data: runs.map((run) => ({ ...run, key: run.id })),
    },
    config: { selectable: true, hoverable: true, bordered: false, ariaLabel: words.tableLabel },
  };
}

export async function view(context: ViewContext<RunsRoute>): Promise<PageResult> {
  const { route, workspace } = context;
  const query: RunQuery = { q: route.q, status: route.status, mode: route.mode, days: route.range === "7d" ? RANGE_DAYS : undefined };
  let list = await api.listRuns(query);
  const selected = new Set<string>();

  const band = (): Node => {
    if (!selected.size) return stack([], { gap: 0 });
    const n = selected.size;
    const act = async (work: () => Promise<string>): Promise<void> => {
      try {
        notify(await work(), "success");
        selected.clear();
        await reload();
      } catch (error) {
        notify(errorMessage(error), "danger");
      }
    };
    return glass(
      row(
        [
          text("small", n === 1 ? words.selectedOne : fill(words.selected, { n }), { bold: true }),
          row(
            [
              button("primary", fill(words.retry, { n }), {
                size: "sm",
                icon: "rotate-ccw",
                onClick: () => void act(async () => fill(words.retried, { n: (await api.retryRuns([...selected])).length })),
              }),
              button("glass", fill(words.delete, { n }), { size: "sm", onClick: () => void act(async () => fill(words.deleted, { n: (await api.deleteRuns([...selected])).deleted })) }),
              button("ghost", words.clear, {
                size: "sm",
                onClick: () => {
                  selected.clear();
                  showTable();
                },
              }),
            ],
            { gap: 8 },
          ),
        ],
        { justify: "space-between", wrap: true },
      ),
      { pad: "s", glow: "lime" },
    );
  };

  const results = (): Node => {
    if (!list.runs.length) return { tag: "xwui-empty", data: { icon: "search", title: words.empty.title, description: words.empty.description } };
    return stack(
      [
        glass(
          {
            ...runTable(list.runs),
            ref: (instance) => {
              const table = instance as Table;
              const rows = list.runs.map((run, index) => (selected.has(run.id) ? index : -1)).filter((index) => index >= 0);
              if (rows.length) table.setSelectedRows(rows);
              table.onSelect((indexes) => {
                selected.clear();
                for (const index of indexes) if (list.runs[index]) selected.add(list.runs[index].id);
                context.instance<XWUIComposer>("runs-band")?.setTree(band());
              });
            },
          },
          { pad: "none", scroll: true },
        ),
        text("small", words.end, { tone: "tertiary" }),
      ],
      { gap: 12 },
    );
  };

  const showTable = (): void => {
    context.instance<XWUIComposer>("runs-band")?.setTree(band());
    context.instance<XWUIComposer>("runs-results")?.setTree(results());
  };

  const reload = async (): Promise<void> => {
    list = await api.listRuns(query);
    for (const id of [...selected]) if (!list.runs.some((run) => run.id === id)) selected.delete(id);
    context.instance<XWUIComposer>("runs-kpis")?.setTree(kpis(list));
    showTable();
  };

  const apply = (patch: Partial<RunQuery>): void => {
    const hadRange = Boolean(query.days);
    Object.assign(query, patch);
    replaceQuery(paths.runs, { q: query.q, status: query.status, mode: query.mode, range: query.days ? null : "all" });
    if (hadRange && !query.days) context.refresh();
    else void reload().catch((error) => notify(errorMessage(error, catalog.errors.load), "danger"));
  };

  /* Keep "running now" honest while anything is in flight. */
  const timer = setInterval(() => {
    if (list.runs.some((run) => run.status === "running") || list.counts.running > 0) void reload().catch(() => undefined);
  }, config.pollMs);
  context.onLeave(() => clearInterval(timer));

  const statuses: RunStatus[] = ["running", "succeeded", "retried", "failed"];
  const modes: RunMode[] = ["production", "test", "retry", "replay"];
  const select = (value: string, placeholder: string, options: Array<{ value: string; label: string }>, label: string, onPick: (value: string) => void): Node => ({
    tag: "xwui-select",
    data: { value, placeholder, options: [{ value: "", label: placeholder }, ...options] },
    config: { ariaLabel: label },
    ref: (instance) => (instance as { onChange(handler: (value: unknown) => void): void }).onChange((picked) => onPick(String(picked))),
  });

  const toolbar = row(
    [
      {
        tag: "xwui-box",
        config: { width: "100%" },
        slots: {
          children: {
            tag: "xwui-input-text",
            data: { value: query.q ?? "", placeholder: words.search },
            config: { type: "search", leadingIcon: "search", ariaLabel: words.searchLabel, fullWidth: true, clearable: true },
            ref: (instance) =>
              (instance as { onChange(handler: (value: string) => void): void }).onChange(debounce((value: string) => apply({ q: value.trim() }), config.searchDebounceMs)),
          },
        },
      },
      select(query.status ?? "", words.anyStatus, statuses.map((value) => ({ value, label: catalog.studio.runStatus[value] })), words.statusLabel, (value) =>
        apply({ status: value as RunStatus | "" }),
      ),
      select(query.mode ?? "", words.anyMode, modes.map((value) => ({ value, label: catalog.studio.runMode[value] })), words.modeLabel, (value) => apply({ mode: value as RunMode | "" })),
      ...(query.days
        ? [
            {
              tag: "xwui-chip",
              data: { label: words.range },
              config: { closable: true },
              ref: (instance: unknown) => (instance as { onClose(handler: () => void): void }).onClose(() => apply({ days: undefined })),
            },
          ]
        : []),
    ],
    { gap: 12, wrap: true },
  );

  return {
    bar: { crumbs: [{ label: workspace.project.name, href: href(paths.flows) }, { label: words.title }] },
    body: [
      text("h2", words.title),
      projectTabs("runs", ["flows", "agents", "tables", "connections", "runs", "mcp"]),
      { tag: "xwui-composer", key: "runs-kpis", data: { tree: kpis(list) } },
      toolbar,
      { tag: "xwui-composer", key: "runs-band", data: { tree: band() } },
      { tag: "xwui-composer", key: "runs-results", data: { tree: results() } },
    ],
  };
}
