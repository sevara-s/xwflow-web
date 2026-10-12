/**
 * The editor's panel contents: the status tags, the step palette, and the
 * run panel with its mini ledger and payloads. Pure: each draws from the data
 * it is given.
 */
import { fill, formatMs } from "../../app/format";
import { flowStatusView, resultView } from "../../app/status";
import { catalog } from "../../content/catalog";
import type { Attempt, FlowDetail, RunDetail } from "../../types/domain";
import { hueOf, toneOf } from "../../ui/flow";
import { cell, row, stack, status, tag, text, type Node } from "../../ui/kit";

const words = catalog.studio.editor;

export function latestFailure(run: RunDetail | null): Attempt | undefined {
  return run?.attempts.find((item) => item.result.kind === "failed");
}

export function statusTags(detail: FlowDetail): Node {
  const state = detail.flow.status;
  return row(
    [
      ...(state !== "draft" ? [tag(catalog.studio.flowStatus.published, "lime")] : []),
      ...(state !== "published" ? [tag(flowStatusView(state).label, state === "draft" ? undefined : "amber")] : []),
    ],
    { gap: "s" },
  );
}

export function palette(detail: FlowDetail, query: string, add: (item: FlowDetail["palette"][number]["items"][number]) => void): Node {
  const q = query.trim().toLowerCase();
  const groups = detail.palette
    .map((group) => ({ group: group.group, items: group.items.filter((item) => !q || item.label.toLowerCase().includes(q)) }))
    .filter((group) => group.items.length);
  if (!groups.length) return text("small", words.noSteps, { tone: "secondary" });
  return stack(
    groups.map((group) =>
      stack(
        [
          text("xs", catalog.studio.groupLabels[group.group], { bold: true, caps: true, tone: "tertiary" }),
          ...group.items.map((item): Node => {
            const type = catalog.studio.stepTypes[item.id as keyof typeof catalog.studio.stepTypes];
            return {
              tag: "xwui-button",
              data: { text: item.label },
              config: {
                variant: "ghost",
                size: "sm",
                fullWidth: true,
                align: "start",
                icon: type?.icon ?? catalog.studio.groupIcons[item.group],
                iconColor: `var(--xwui-hue-${hueOf[item.group]})`,
              },
              on: { click: () => add(item) },
            };
          }),
        ],
        { gap: "xs" },
      ),
    ),
    { gap: "m" },
  );
}

function miniLedger(attempts: Attempt[], focus: Attempt | undefined): Node {
  const columns = words.columns;
  const receipt = catalog.studio.receipt;
  return {
    tag: "xwui-table",
    data: {
      columns: [
        { key: "step", title: columns.step, render: (_: unknown, item: Attempt) => cell(text("small", item.step, { bold: true, tone: item.id === focus?.id ? "lime" : undefined })) },
        {
          key: "try",
          title: columns.try,
          render: (_: unknown, item: Attempt) =>
            cell(
              text(
                "small",
                item.tryIndex === null ? receipt.tryNone : item.tryCount && item.tryCount > 1 ? fill(receipt.tryOf, { n: item.tryIndex, total: item.tryCount }) : String(item.tryIndex),
              ),
            ),
        },
        {
          key: "result",
          title: columns.result,
          render: (_: unknown, item: Attempt) => {
            const view = resultView(item.result, true);
            return cell(status(toneOf[view.tone], view.label));
          },
        },
        { key: "inCount", title: columns.in, align: "end" },
        { key: "outCount", title: columns.out, align: "end" },
        {
          key: "durationMs",
          title: columns.time,
          align: "end",
          render: (_: unknown, item: Attempt) =>
            cell(
              item.durationMs === null
                ? text("small", catalog.studio.flows.notRecorded, { mono: true, tone: "tertiary" })
                : text("small", formatMs(item.durationMs), { mono: true }),
            ),
        },
      ],
      data: attempts.map((item) => ({ ...item, key: item.id })),
    },
    config: { hoverable: true, bordered: false, size: "small", ariaLabel: receipt.ledgerLabel },
  };
}

export function runBody(latest: RunDetail | null, tab: string, selectedId: string | null): Node {
  if (!latest) return text("small", words.noRun, { tone: "secondary" });
  const attempts = latest.attempts;
  const focus = attempts.filter((item) => item.nodeId === selectedId).at(-1);
  if (tab === "ledger") return miniLedger(attempts.filter((item) => item.result.kind !== "notRun"), focus);
  if (tab === "problems") {
    const problems = attempts.filter((item) => item.result.kind === "failed");
    if (!problems.length) return text("small", words.noProblems, { tone: "secondary" });
    return stack(
      problems.map((item) => {
        const view = resultView(item.result, true);
        return status(toneOf[view.tone], view.label);
      }),
      { gap: "s" },
    );
  }
  const payload = focus ? (tab === "input" ? focus.io.input : focus.io.output) : {};
  return { tag: "xwui-code-block", data: { code: JSON.stringify(payload, null, 2) }, config: { language: "json", copyable: true } };
}
