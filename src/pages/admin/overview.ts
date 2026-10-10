import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill, formatAgo, formatList, formatNumber } from "../../app/format";
import type { PageContext } from "../../app/page";
import { href, paths } from "../../app/router";
import { XWFlowIsoTiles } from "../../components/XWFlowIsoTiles/XWFlowIsoTiles";
import type { IsoTile } from "../../components/XWFlowIsoTiles/XWFlowIsoTiles.types";
import { XWFlowKpi } from "../../components/XWFlowKpi/XWFlowKpi";
import type { KpiTone } from "../../components/XWFlowKpi/XWFlowKpi.types";
import { XWFlowStackedBars } from "../../components/XWFlowStackedBars/XWFlowStackedBars";
import { XWFlowStatus } from "../../components/XWFlowStatus/XWFlowStatus";
import { catalog } from "../../content/catalog";
import type { AdminOverview } from "../../types/domain";
import { XWUIAlert, XWUIProgressBar, XWUITable } from "../../xwui";
import { glass, heading } from "../studio/common";
import { mountAdminBar } from "./common";
import "./admin.css";

const words = catalog.admin.overview;
const kpiTones: Record<AdminOverview["kpis"][number]["id"], KpiTone> = { runs24h: "cyan", failed24h: "red", overdue: "lime", queued: "violet" };
const tilePlaces = [
  [20, 20, 30],
  [200, 20, 44],
  [20, 200, 20],
  [200, 200, 8],
] as const;

export async function render(context: PageContext): Promise<void> {
  const { scope, body } = context;
  await mountAdminBar(context, "admin", words.title);
  const intro = el("div", "xwflow-stack xwflow-gap-4");
  body.append(intro);
  heading(intro, 1, "h2", words.title);
  intro.append(el("p", "xwflow-sec", words.lead));

  let overview: AdminOverview;
  try {
    overview = await api.getAdminOverview();
  } catch (error) {
    scope.track(new XWUIAlert(slot(body), { message: fill(words.panelError, { message: (error as Error).message }) }, { variant: "error" }));
    return;
  }

  const kpis = el("div", "xwflow-grid");
  kpis.style.setProperty("--xwflow-min", "210px");
  body.append(kpis);
  for (const kpi of overview.kpis) {
    const note = kpi.note === "noAdmission" ? words.noAdmission : kpi.asOf ? fill(words.asOf, { when: formatAgo(kpi.asOf) }) : undefined;
    scope.track(
      new XWFlowKpi(
        slot(kpis),
        { label: words.kpis[kpi.id], value: kpi.value, note, emptyLabel: words.notRecorded },
        { tone: kpiTones[kpi.id], emphasis: kpi.id === "failed24h" && (kpi.value ?? 0) > 0 },
      ),
    );
  }

  const panels = el("div", "xwflow-admin-panels");
  body.append(panels);
  const chart = glass(panels, { pad: "m", className: "xwflow-stack xwflow-gap-16 xwflow-admin-panels__wide", label: words.runsByHour });
  const chartHead = el("div", "xwflow-row xwflow-gap-12 xwflow-wrap");
  chart.append(chartHead);
  heading(chartHead, 2, "h3", words.runsByHour);
  scope.track(new XWFlowStatus(slot(chartHead), { tone: "idle", label: words.succeeded }, { className: "xwflow-status--series" }));
  scope.track(new XWFlowStatus(slot(chartHead), { tone: "err", label: words.failed }));
  chartHead.append(el("span", "xwflow-xs xwflow-ter xwflow-push", words.last24));
  const peak = overview.runsByHour.reduce((best, hour, index, list) => (hour.succeeded + hour.failed > list[best].succeeded + list[best].failed ? index : best), 0);
  const peakHour = (new Date().getHours() - (overview.runsByHour.length - 1 - peak) + 24) % 24;
  scope.track(
    new XWFlowStackedBars(slot(chart), {
      bars: overview.runsByHour.map((hour) => ({ base: hour.succeeded, alert: hour.failed })),
      label: fill(words.chartLabel, { peak: String(peakHour).padStart(2, "0") }),
      start: words.chartStart,
      end: words.chartEnd,
    }),
  );

  const reach = glass(panels, { pad: "m", className: "xwflow-stack xwflow-gap-8", label: words.reachability });
  const reachHead = el("div", "xwflow-row xwflow-gap-8");
  reach.append(reachHead);
  heading(reachHead, 2, "h3", words.reachability);
  reachHead.append(el("span", "xwflow-xs xwflow-ter xwflow-push", words.perCheck));
  const services = overview.reachability;
  const down = services.filter((service) => service.state === "err");
  const tiles: IsoTile[] = services.slice(0, 4).map((service, index) => ({
    id: service.id,
    label: service.label,
    state: service.state === "ok" ? (["ok", "info", "violet", "ok"] as const)[index] : service.state,
    x: tilePlaces[index][0],
    y: tilePlaces[index][1],
    lift: tilePlaces[index][2],
  }));
  scope.track(new XWFlowIsoTiles(slot(reach), { tiles, label: fill(words.reachLabel, { down: down.length, total: services.length }) }));
  const issue = el("div", "xwflow-band xwflow-small");
  issue.dataset.tone = down.length ? "err" : "lime";
  if (down.length) {
    const service = down[0];
    const minutes = service.downSince ? Math.max(1, Math.round((Date.now() - service.downSince) / 60_000)) : 0;
    const others = services.filter((item) => item.state !== "err").map((item) => item.label);
    const othersText = formatList(others);
    const text = fill(words.issue, { service: service.label, minutes, others: othersText });
    const [lead, rest] = [text.slice(0, text.indexOf(":") + 1), text.slice(text.indexOf(":") + 1)];
    const line = el("div");
    line.append(el("b", undefined, lead), rest, " ");
    const link = el("a", undefined, words.openHealth);
    link.href = href(paths.health);
    line.append(link);
    issue.append(line);
  } else {
    issue.append(words.allClear);
  }
  reach.append(issue);

  const failing = el("section", "xwflow-stack xwflow-gap-12");
  failing.setAttribute("aria-label", words.failingLabel);
  body.append(failing);
  const failingHead = el("div", "xwflow-row xwflow-gap-8");
  failing.append(failingHead);
  heading(failingHead, 2, "h3", words.failing);
  const asOf = overview.kpis.find((kpi) => kpi.id === "failed24h")?.asOf;
  if (asOf) failingHead.append(el("span", "xwflow-xs xwflow-ter xwflow-push", fill(words.asOf, { when: formatAgo(asOf) })));
  const total = overview.failing.reduce((sum, row) => sum + row.failed, 0) || 1;
  type Row = AdminOverview["failing"][number];
  scope.track(
    new XWUITable(
      slot(failing, "xwflow-table"),
      {
        columns: [
          {
            key: "flow",
            title: words.columns.flow,
            render: (_: unknown, row: Row) => {
              const link = el("a", "xwflow-cell-link", row.flow);
              link.href = href(paths.runs, { q: row.flow, status: "failed", range: "all" });
              return link;
            },
          },
          { key: "tenant", title: words.columns.tenant, render: (_: unknown, row: Row) => el("span", "xwflow-sec", row.tenant) },
          { key: "failed", title: words.columns.failed, align: "end", render: (_: unknown, row: Row) => el("span", "xwflow-mono", formatNumber(row.failed)) },
          {
            key: "share",
            title: words.columns.share,
            render: (_: unknown, row: Row) => {
              const box = el("div", "xwflow-share");
              const share = Math.round((row.failed / total) * 100);
              scope.track(new XWUIProgressBar(box, { value: share }, { size: "sm", block: true, color: "error" }));
              box.setAttribute("aria-label", `${share}%`);
              return box;
            },
          },
          { key: "cause", title: words.columns.cause, render: (_: unknown, row: Row) => el("span", undefined, row.cause) },
        ],
        data: overview.failing.map((row) => ({ ...row, key: row.flowId })),
      },
      { hoverable: true, bordered: false, ariaLabel: words.failingLabel },
    ),
  );
}
