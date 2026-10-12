import { api } from "../../api/client";
import { fill, formatDate, formatNumber } from "../../app/format";
import { adminBar } from "../../app/shells/admin-view";
import { siteHref } from "../../app/site-links";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import { button, grid, row, stack, text, type Node } from "../../ui/kit";
import { kpi, pageHead, section } from "./console-view";

const words = catalog.console.usage;

export async function view(context: ViewContext): Promise<PageResult> {
  const usage = await api.getUsage();
  const k = words.kpis;
  const failed = usage.daily.reduce((sum, day) => sum + day.failed, 0);
  const share = (runs: number): number => (usage.runs ? Math.round((runs / usage.runs) * 100) : 0);

  const top: Node = section(words.top, [
    stack(
      usage.topFlows.map((item) =>
        stack(
          [
            row([text("small", item.flow, { bold: true }), text("small", fill(words.shareLine, { runs: formatNumber(item.runs), share: share(item.runs) }), { tone: "secondary" })], { justify: "space-between" }),
            { tag: "xwui-progress", data: { value: share(item.runs) }, config: { size: "small", ariaLabel: item.flow } },
          ],
          { gap: "s" },
        ),
      ),
      { gap: "l" },
    ),
  ]);

  return {
    bar: adminBar(context.admin!, "admin", words.title, { plan: true }),
    body: [
      ...pageHead(words.title, fill(words.lead, { tenant: context.admin!.tenant.name })),
      text("small", fill(words.periodEnds, { date: formatDate(usage.periodEnds) }), { tone: "secondary" }),
      grid(
        [
          kpi(k.runs, formatNumber(usage.runs), "lime", fill(words.ofIncluded, { included: formatNumber(usage.runsIncluded) })),
          kpi(k.steps, formatNumber(usage.steps), "cyan"),
          kpi(k.ai, formatNumber(usage.aiCalls), "pink"),
          kpi(k.storage, fill(words.storageValue, { used: usage.storageGb }), "violet", fill(words.storageNote, { included: usage.storageIncludedGb })),
        ],
        "kpi",
      ),
      grid(
        [
          section(words.daily, [
            {
              tag: "xwui-spark-bars",
              data: { bars: usage.daily.map((day) => ({ value: day.runs, alert: day.failed > 2 })), label: fill(words.dailyLabel, { failed }) },
              config: { height: 140 },
            },
          ]),
          top,
        ],
        "half",
      ),
      row([text("small", words.upgrade, { tone: "secondary" }), button("glass", words.seePlans, { size: "sm", href: siteHref("pricing") })], { gap: "m", wrap: true }),
    ],
  };
}
