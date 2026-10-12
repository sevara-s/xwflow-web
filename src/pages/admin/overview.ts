import { api } from "../../api/client";
import { fill, formatAgo, formatList, formatNumber } from "../../app/format";
import { href, paths } from "../../app/router";
import { adminBar } from "../../app/shells/admin-view";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { AdminOverview } from "../../types/domain";
import { button, cell, glass, grid, row, space, stack, status, text, type Hue, type Node } from "../../ui/kit";
import { columns } from "../../ui/layout";

const words = catalog.admin.overview;
const kpiHues: Record<AdminOverview["kpis"][number]["id"], Hue> = { runs24h: "cyan", failed24h: "red", overdue: "lime", queued: "violet" };
/** Where the four reachability tiles sit on the plane, and how far each lifts. */
const tilePlaces = [
  [10, 10, 30],
  [160, 10, 44],
  [10, 160, 20],
  [160, 160, 8],
] as const;
/** A 290px plane turned 45° fits a half-width panel without clipping a tile. */
const PLANE = 290;
const okHues: Hue[] = ["green", "cyan", "violet", "green"];

function kpis(overview: AdminOverview): Node {
  return grid(
    overview.kpis.map((kpi) => ({
      tag: "xwui-kpi-card",
      data: {
        label: words.kpis[kpi.id],
        value: kpi.value === null ? null : formatNumber(kpi.value),
        emptyLabel: words.notRecorded,
        note: kpi.note === "noAdmission" ? words.noAdmission : kpi.asOf ? fill(words.asOf, { when: formatAgo(kpi.asOf) }) : undefined,
      },
      config: { hue: kpiHues[kpi.id], emphasis: kpi.id === "failed24h" && (kpi.value ?? 0) > 0 },
    })),
    "kpiCompact",
    "l",
  );
}

function runsByHour(overview: AdminOverview): Node {
  const hours = overview.runsByHour;
  const peak = hours.reduce((best, hour, index) => (hour.succeeded + hour.failed > hours[best].succeeded + hours[best].failed ? index : best), 0);
  const peakHour = (new Date().getHours() - (hours.length - 1 - peak) + 24) % 24;
  return glass(
    stack(
      [
        row(
          [text("h3", words.runsByHour, { level: 2 }), row([status("neutral", words.succeeded), status("error", words.failed), text("xs", words.last24, { tone: "tertiary" })], { gap: "l", wrap: true })],
          { justify: "space-between", wrap: true },
        ),
        {
          tag: "xwui-stacked-bars",
          data: {
            bars: hours.map((hour) => ({ base: hour.succeeded, alert: hour.failed })),
            label: fill(words.chartLabel, { peak: String(peakHour).padStart(2, "0") }),
            start: words.chartStart,
            end: words.chartEnd,
          },
        },
      ],
      { gap: "l" },
    ),
    { pad: "m" },
  );
}

function reachability(overview: AdminOverview): Node {
  const services = overview.reachability;
  const down = services.filter((service) => service.state === "err");
  const tiles = services.slice(0, 4).map((service, index) => ({
    id: service.id,
    label: service.label,
    hue: service.state === "ok" ? okHues[index] : service.state === "warn" ? "amber" : "red",
    alert: service.state === "err",
    x: tilePlaces[index][0],
    y: tilePlaces[index][1],
    lift: tilePlaces[index][2],
  }));
  let message: string = words.allClear;
  if (down.length) {
    const service = down[0];
    const minutes = service.downSince ? Math.max(1, Math.round((Date.now() - service.downSince) / 60_000)) : 0;
    message = fill(words.issue, { service: service.label, minutes, others: formatList(services.filter((item) => item.state !== "err").map((item) => item.label)) });
  }
  return glass(
    stack(
      [
        row([text("h3", words.reachability, { level: 2 }), text("xs", words.perCheck, { tone: "tertiary" })], { justify: "space-between" }),
        { tag: "xwui-iso-tiles", data: { tiles, label: fill(words.reachLabel, { down: down.length, total: services.length }) }, config: { width: PLANE, height: PLANE, viewHeight: 280 } },
        { tag: "xwui-alert", data: { message }, config: { variant: down.length ? "error" : "success" } },
        row([button("ghost", words.openHealth, { size: "sm", iconAfter: true, icon: "arrow-right", href: href(paths.health) })]),
      ],
      { gap: "m" },
    ),
    { pad: "m" },
  );
}

function failing(overview: AdminOverview): Node {
  type Row = AdminOverview["failing"][number];
  const total = overview.failing.reduce((sum, item) => sum + item.failed, 0) || 1;
  const asOf = overview.kpis.find((kpi) => kpi.id === "failed24h")?.asOf;
  const columns = words.columns;
  return stack(
    [
      row([text("h3", words.failing, { level: 2 }), ...(asOf ? [text("xs", fill(words.asOf, { when: formatAgo(asOf) }), { tone: "tertiary" })] : [])], { justify: "space-between" }),
      glass(
        {
          tag: "xwui-table",
          data: {
            columns: [
              {
                key: "flow",
                title: columns.flow,
                render: (_: unknown, item: Row) => cell(button("ghost", item.flow, { size: "sm", href: href(paths.runs, { q: item.flow, status: "failed", range: "all" }) })),
              },
              { key: "tenant", title: columns.tenant, render: (_: unknown, item: Row) => cell(text("small", item.tenant, { tone: "secondary" })) },
              { key: "failed", title: columns.failed, align: "end", render: (_: unknown, item: Row) => cell(text("small", formatNumber(item.failed), { mono: true })) },
              {
                key: "share",
                title: columns.share,
                render: (_: unknown, item: Row) => {
                  const share = Math.round((item.failed / total) * 100);
                  return cell({ tag: "xwui-progress", data: { value: share, label: `${share}%` }, config: { size: "sm", color: "error" } });
                },
              },
              { key: "cause", title: columns.cause, render: (_: unknown, item: Row) => cell(text("small", item.cause)) },
            ],
            data: overview.failing.map((item) => ({ ...item, key: item.flowId })),
          },
          config: { hoverable: true, bordered: false, ariaLabel: words.failingLabel },
        },
        { pad: "none", scroll: true },
      ),
    ],
    { gap: "m" },
  );
}

export async function view(context: ViewContext): Promise<PageResult> {
  const bar = adminBar(context.admin!, "admin", words.title);
  const head = [text("h2", words.title, { level: 1 }), text("lead", words.lead)];
  let overview: AdminOverview;
  try {
    overview = await api.getAdminOverview();
  } catch (error) {
    return { bar, body: [...head, { tag: "xwui-alert", data: { message: fill(words.panelError, { message: (error as Error).message }) }, config: { variant: "error" } }] };
  }
  return {
    bar,
    body: [
      ...head,
      kpis(overview),
      {
        tag: "xwui-grid",
        config: { columns: columns.one, gap: space("xl"), alignItems: "start", responsive: { lg: { columns: columns.threeTwo } } },
        slots: { children: [runsByHour(overview), reachability(overview)] },
      },
      failing(overview),
    ],
  };
}
