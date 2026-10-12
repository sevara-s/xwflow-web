import { api } from "../../api/client";
import { fill, formatMs, formatNumber } from "../../app/format";
import { navigate, paths, type Route } from "../../app/router";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { Insights } from "../../types/domain";
import { button, cell, glass, grid, row, space, stack, status, tag, text, type Node } from "../../ui/kit";

type InsightsRoute = Extract<Route, { page: "insights" }>;

const words = catalog.workspace.insights;

function kpis(insights: Insights): Node {
  const { totals } = insights;
  const rate = Math.round(totals.successRate * 1000) / 10;
  const kpi = (label: string, value: string, hue: string, note?: string): Node => ({ tag: "xwui-kpi-card", data: { label, value, note }, config: { hue } });
  return grid(
    [
      kpi(words.kpis.runs, formatNumber(totals.runs), "cyan", `${formatNumber(totals.failed)} ${words.failed.toLocaleLowerCase()}`),
      glass(
        row(
          [
            {
              tag: "xwui-progress-circle",
              data: { value: rate, label: words.kpis.success },
              config: { size: 76, strokeWidth: 8, showValue: false, valueColor: rate >= 95 ? "var(--xwui-hue-green)" : "var(--xwui-hue-amber)" },
            },
            stack([text("xs", words.kpis.success, { bold: true, caps: true, tone: "secondary" }), text("disp", `${rate}%`)], { gap: "xs" }),
          ],
          { gap: "l" },
        ),
        { pad: "s" },
      ),
      kpi(words.kpis.avg, totals.avgMs === null ? words.notRecorded : formatMs(totals.avgMs), "violet"),
      kpi(words.kpis.saved, fill(words.hours, { n: formatNumber(Math.round(totals.minutesSaved / 60)) }), "lime"),
    ],
    220,
    "l",
  );
}

function topFlows(insights: Insights): Node {
  const columns = words.columns;
  const total = insights.topFlows.reduce((sum, flow) => sum + flow.runs, 0) || 1;
  type Row = Insights["topFlows"][number];
  return glass(
    stack(
      [
        text("h3", words.topFlows, { level: 2 }),
        {
          tag: "xwui-table",
          data: {
            columns: [
              { key: "name", title: columns.flow, render: (_: unknown, flow: Row) => cell(button("ghost", flow.name, { size: "sm", onClick: () => navigate(paths.runs, { q: flow.name, range: "all" }) })) },
              { key: "runs", title: columns.runs, align: "end", render: (_: unknown, flow: Row) => cell(text("small", formatNumber(flow.runs), { mono: true })) },
              { key: "failed", title: columns.failed, align: "end", render: (_: unknown, flow: Row) => cell(text("small", formatNumber(flow.failed), { mono: true, tone: flow.failed ? undefined : "tertiary" })) },
              {
                key: "share",
                title: columns.share,
                render: (_: unknown, flow: Row) => cell({ tag: "xwui-progress", data: { value: Math.round((flow.runs / total) * 100) }, config: { size: "sm" } }),
              },
              { key: "minutesSaved", title: columns.saved, align: "end", render: (_: unknown, flow: Row) => cell(tag(fill(words.hours, { n: Math.round(flow.minutesSaved / 60) }), "lime")) },
            ],
            data: insights.topFlows.map((flow) => ({ ...flow, key: flow.flowId })),
          },
          config: { hoverable: true, bordered: false, ariaLabel: words.tableLabel },
        },
      ],
      { gap: "l" },
    ),
    { pad: "m", scroll: true },
  );
}

function causes(insights: Insights): Node {
  const most = Math.max(1, ...insights.causes.map((item) => item.count));
  return glass(
    stack(
      [
        text("h3", words.causes, { level: 2 }),
        ...insights.causes.map((item) =>
          stack(
            [
              row([text("small", item.cause, { bold: true }), text("xs", fill(words.causeCount, { n: item.count }), { mono: true, tone: "secondary" })], { justify: "space-between", gap: "m" }),
              { tag: "xwui-progress", data: { value: Math.round((item.count / most) * 100) }, config: { size: "sm", color: "error" } },
              text("xs", item.flow, { tone: "tertiary" }),
            ],
            { gap: "s" },
          ),
        ),
      ],
      { gap: "l" },
    ),
    { pad: "m" },
  );
}

function slowSteps(insights: Insights): Node {
  return glass(
    stack(
      [
        text("h3", words.slow, { level: 2 }),
        ...insights.slowSteps.map((step) =>
          row(
            [stack([text("small", step.step, { bold: true }), text("xs", step.flow, { tone: "tertiary" })], { gap: "xs" }), tag(fill(words.p95, { ms: formatNumber(step.p95Ms) }), step.p95Ms > 1500 ? "orange" : "cyan")],
            { justify: "space-between", gap: "m" },
          ),
        ),
      ],
      { gap: "l" },
    ),
    { pad: "m" },
  );
}

export async function view(context: ViewContext<InsightsRoute>): Promise<PageResult> {
  const { route } = context;
  const insights = await api.getInsights({ days: route.days });
  const days = insights.days;

  return {
    bar: { crumbs: [{ label: words.title }], sample: "data" },
    body: [
      row(
        [
          stack([text("h2", words.title, { level: 1 }), text("lead", words.lead)], { gap: "s" }),
          {
            tag: "xwui-segmented-control",
            data: { value: String(route.days) },
            config: { options: words.ranges.map((range) => ({ value: range.id, label: range.label })), ariaLabel: words.rangeLabel },
            ref: (instance) => (instance as { onChange?(handler: (value: string) => void): void }).onChange?.((value) => navigate(paths.insights, { days: value === "7" ? "7" : null })),
          },
        ],
        { justify: "space-between", wrap: true, gap: "l", align: "flex-end" },
      ),
      kpis(insights),
      glass(
        stack(
          [
            row(
              [text("h3", words.daily, { level: 2 }), row([status("neutral", words.succeeded), status("error", words.failed)], { gap: "l" })],
              { justify: "space-between", wrap: true },
            ),
            {
              tag: "xwui-stacked-bars",
              data: {
                bars: days.map((day) => ({ base: day.succeeded, alert: day.failed })),
                label: fill(words.chartLabel, { runs: insights.totals.runs, failed: insights.totals.failed }),
                start: fill(words.start, { n: days.length - 1 }),
                end: words.end,
              },
              config: { height: 200 },
            },
          ],
          { gap: "l" },
        ),
        { pad: "m" },
      ),
      topFlows(insights),
      {
        tag: "xwui-grid",
        config: { columns: "minmax(0, 1fr)", gap: space("xl"), alignItems: "start", responsive: { md: { columns: "repeat(2, minmax(0, 1fr))" } } },
        slots: { children: [causes(insights), slowSteps(insights)] },
      },
    ],
  };
}
