import { api } from "../../api/client";
import { fill, formatAgo, formatMs, formatNumber } from "../../app/format";
import { href, navigate, paths } from "../../app/router";
import { runStatusView } from "../../app/status";
import type { PageResult } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { AttentionItem, Overview } from "../../types/domain";
import { toneOf } from "../../ui/flow";
import { button, glass, grid, iconTile, row, shape, stack, status, text, type Hue, type Node } from "../../ui/kit";

const words = catalog.workspace.overview;

const kindIcons: Record<AttentionItem["kind"], { icon: string; hue: Hue }> = {
  run: { icon: "zap", hue: "lime" },
  connection: { icon: "plug", hue: "cyan" },
  mcp: { icon: "server", hue: "violet" },
  chat: { icon: "message-square", hue: "pink" },
  agent: { icon: "bot", hue: "orange" },
};

function greeting(name: string): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? words.greeting.morning : hour < 18 ? words.greeting.afternoon : words.greeting.evening;
  return fill(words.greetingName, { greeting: part, name });
}

function target(item: AttentionItem): () => void {
  if (item.kind === "run") return () => navigate(paths.run(item.id));
  if (item.kind === "connection") return () => navigate(paths.connections, { q: item.title });
  if (item.kind === "mcp") return () => navigate(paths.mcp);
  if (item.kind === "agent") return () => navigate(paths.agents, { status: "paused" });
  return () => navigate(paths.studio, { chat: item.id });
}

function attention(overview: Overview): Node {
  const items = overview.attention;
  return glass(
    stack(
      [
        row([text("h3", words.attention), text("xs", fill(words.attentionCount, { n: items.length }), { tone: "tertiary" })], { justify: "space-between" }),
        items.length
          ? stack(
              items.map((item) =>
                row(
                  [
                    row(
                      [
                        iconTile(kindIcons[item.kind].icon, kindIcons[item.kind].hue, "sm"),
                        stack(
                          [
                            text("small", item.title, { bold: true }),
                            status(item.tone, item.kind === "connection" ? words.connectionTone[item.tone] : words.kinds[item.kind]),
                          ],
                          { gap: 2 },
                        ),
                      ],
                      { gap: 12 },
                    ),
                    button("glass", words.open, { size: "sm", iconAfter: true, icon: "arrow-right", onClick: target(item) }),
                  ],
                  { justify: "space-between", gap: 12 },
                ),
              ),
              { gap: 14 },
            )
          : { tag: "xwui-alert", data: { message: words.allClear }, config: { variant: "success" } },
      ],
      { gap: 16 },
    ),
    { pad: "m", gradientBorder: items.some((item) => item.tone === "error") },
  );
}

function recent(overview: Overview): Node {
  return glass(
    stack(
      [
        row([text("h3", words.recent), button("ghost", words.allRuns, { size: "sm", href: href(paths.runs) })], { justify: "space-between" }),
        stack(
          overview.recent.map((run) => {
            const view = runStatusView(run.status);
            return {
              ...row(
                [
                  stack([text("small", run.flowName, { bold: true }), text("xs", `${formatAgo(run.startedAt)} · ${run.id}`, { tone: "tertiary", mono: false })], { gap: 2 }),
                  row([status(toneOf[view.tone], view.label), text("xs", run.durationMs === null ? "" : formatMs(run.durationMs), { mono: true, tone: "secondary" })], { gap: 12 }),
                ],
                { justify: "space-between", wrap: true },
              ),
              on: { click: () => navigate(paths.run(run.id)) },
            };
          }),
          { gap: 14 },
        ),
      ],
      { gap: 16 },
    ),
    { pad: "m" },
  );
}

export async function view(): Promise<PageResult> {
  const overview = await api.getOverview();
  const kpi = (label: string, value: number, hue: string): Node => ({ tag: "xwui-kpi-card", data: { label, value: formatNumber(value) }, config: { hue } });

  return {
    bar: { crumbs: [{ label: words.crumb }], sample: "data" },
    body: [
      {
        tag: "xwui-box",
        config: { surface: "glass", padding: 32, overflow: "clip" },
        slots: {
          children: stack(
            [
              shape("halo", "violet", 380, { right: "-80px", top: "-140px" }),
              shape("halo", "lime", 240, { left: "-60px", bottom: "-120px" }),
              shape("orb", "violet", 72, { right: "48px", top: "36px" }),
              text("h2", greeting(overview.you.name)),
              text("lead", `${fill(words.today, { runs: overview.today.runs, failed: overview.today.failed, running: overview.today.running })} ${words.lead}`),
              row(
                [
                  button("primary", words.actions.create, { icon: "sparkles", onClick: () => navigate(paths.studio) }),
                  button("glass", words.actions.templates, { icon: "layers", onClick: () => navigate(paths.templates) }),
                  button("ghost", words.actions.runs, { iconAfter: true, icon: "arrow-right", onClick: () => navigate(paths.runs) }),
                ],
                { gap: 10, wrap: true },
              ),
            ],
            { gap: 14 },
          ),
        },
      },
      grid(
        [
          kpi(words.kpis.published, overview.counts.published, "lime"),
          kpi(words.kpis.drafts, overview.counts.drafts, "orange"),
          kpi(words.kpis.agents, overview.counts.liveAgents, "violet"),
          kpi(words.kpis.connections, overview.counts.connections, "cyan"),
        ],
        200,
        16,
      ),
      {
        tag: "xwui-grid",
        config: { columns: "minmax(0, 1fr)", gap: "24px", alignItems: "start", responsive: { lg: { columns: "minmax(0, 3fr) minmax(0, 2fr)" } } },
        slots: {
          children: [
            attention(overview),
            stack(
              [
                glass(
                  stack(
                    [
                      text("xs", words.week, { bold: true, caps: true, tone: "secondary" }),
                      { tag: "xwui-spark-bars", data: { bars: overview.week, label: words.weekLabel }, config: { height: 90 } },
                    ],
                    { gap: 10 },
                  ),
                  { pad: "m" },
                ),
                recent(overview),
              ],
              { gap: 24 },
            ),
          ],
        },
      },
    ],
  };
}
