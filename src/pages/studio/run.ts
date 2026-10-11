import { api } from "../../api/client";
import { fill, formatDate, formatMs, formatStampLong } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { href, navigate, paths, replaceQuery, type Route } from "../../app/router";
import { resultView, runModeTag, runStatusView } from "../../app/status";
import type { PageResult, ViewContext } from "../../app/view";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { Attempt, RunDetail } from "../../types/domain";
import { hueOf, toneOf } from "../../ui/flow";
import { button, cell, decoration, glass, row, space, stack, status, tag, text, type Hue, type Node } from "../../ui/kit";
import type { XWUIComposer } from "../../xwui";

type RunRoute = Extract<Route, { page: "run" }>;

const words = catalog.studio.receipt;

/** The receipt opens on the first failure, or the first step. */
function defaultAttempt(run: RunDetail): Attempt | undefined {
  return run.attempts.find((item) => item.result.kind === "failed") ?? run.attempts[0];
}

function hero(run: RunDetail): Node {
  const tone = run.status === "failed" ? "red" : run.status === "running" ? "cyan" : "green";
  const color = `var(--xwui-hue-${tone})`;
  const view = runStatusView(run.status);
  const mode = runModeTag(run.mode, true);
  const recorded = run.attempts.reduce((sum, item) => sum + (item.durationMs ?? 0), 0);
  return {
    tag: "xwui-box",
    config: { surface: "glass", padding: space("xxl"), overflow: "clip" },
    slots: {
      children: stack(
        [
          decoration("run.halo", run.status === "failed" ? "pink" : "lime"),
          row(
            [
              stack(
                [
                  {
                    tag: "xwui-progress-circle",
                    data: { value: run.stepCount ? Math.round((run.recordedSteps / run.stepCount) * 100) : 0, label: fill(words.gauge, { n: run.recordedSteps, total: run.stepCount }) },
                    config: { size: 116, strokeWidth: 10, showValue: false, valueColor: color },
                  },
                  text("small", `${run.recordedSteps}/${run.stepCount} ${words.recorded}`, { bold: true, align: "center" }),
                ],
                { gap: "s", align: "center" },
              ),
              stack(
                [
                  { tag: "xwui-status-glyph", data: { tone: toneOf[view.tone], label: view.label }, config: { size: "lg" } },
                  text("h2", fill(words.title, { flow: run.flowName, n: run.number })),
                  row(
                    [
                      tag(mode.label, mode.color === "plain" ? undefined : (mode.color as Hue)),
                      tag(formatStampLong(run.startedAt)),
                      tag(fill(words.recordedMs, { ms: formatMs(recorded) })),
                      tag(words.sample, "plan"),
                    ],
                    { wrap: true },
                  ),
                ],
                { gap: "s" },
              ),
            ],
            { gap: "xxl", wrap: true },
          ),
        ],
        { gap: "none" },
      ),
    },
  };
}

function problem(run: RunDetail): Node[] {
  const issue = run.problem;
  if (!issue) return [];
  let message = fill(words.problem, { step: issue.step, try: issue.tryIndex, tries: issue.tryCount, code: issue.code });
  if (issue.recovered) message += fill(words.recovered, { next: issue.tryIndex + 1 });
  return [{ tag: "xwui-alert", data: { message }, config: { variant: "error" } }];
}

function timeline(run: RunDetail): Node {
  const end = run.attempts.reduce((max, item) => Math.max(max, (item.offsetMs ?? 0) + (item.durationMs ?? 0)), 0);
  const sameStep = (attempt: Attempt) => run.attempts.filter((item) => item.nodeId === attempt.nodeId).length > 1;
  const rows = run.attempts.map((attempt) => {
    const kind = attempt.result.kind;
    let caption = attempt.durationMs !== null ? formatMs(attempt.durationMs) : "";
    if (kind === "failed") caption = `${caption}, ${attempt.result.code}`;
    if (kind === "pinned") caption = words.timelineEdge.pinned;
    if (kind === "disabled") caption = words.timelineEdge.skipped;
    if (kind === "notRun") caption = words.timelineEdge.notRun;
    const timed = kind !== "disabled" && kind !== "notRun";
    return {
      id: attempt.id,
      label: sameStep(attempt) && attempt.tryIndex ? `${attempt.step}, ${attempt.tryIndex}` : attempt.step,
      startMs: timed ? attempt.offsetMs ?? 0 : null,
      durationMs: timed ? attempt.durationMs ?? 0 : null,
      caption,
      hue: attempt.group === "integration" ? "gradient" : hueOf[attempt.group],
      failed: kind === "failed",
      muted: !timed,
    };
  });
  return glass(
    stack(
      [
        row([text("h3", words.timeline), row([text("xs", formatMs(0), { tone: "tertiary" }), text("xs", formatMs(end), { tone: "tertiary" })], { gap: "m" })], { justify: "space-between" }),
        // On a phone the track is too narrow for a caption beside its bar, so captions get their own column.
        { tag: "xwui-run-waterfall", data: { rows, label: words.timeline }, config: { layout: window.matchMedia("(max-width: 640px)").matches ? "columns" : "track" } },
      ],
      { gap: "l" },
    ),
    { pad: "m" },
  );
}

function ledger(run: RunDetail, onPick: (attempt: Attempt) => void): Node {
  const columns = words.columns;
  return {
    tag: "xwui-table",
    data: {
      columns: [
        { key: "index", title: columns.index, render: (_: unknown, __: Attempt, index: number) => cell(text("small", String(index + 1), { mono: true, tone: "tertiary" })) },
        { key: "step", title: columns.step, render: (_: unknown, attempt: Attempt) => cell(text("small", attempt.step, { bold: true })) },
        {
          key: "try",
          title: columns.try,
          render: (_: unknown, attempt: Attempt) =>
            cell(
              text(
                "small",
                attempt.tryIndex === null
                  ? words.tryNone
                  : attempt.tryCount && attempt.tryCount > 1
                    ? fill(words.tryOf, { n: attempt.tryIndex, total: attempt.tryCount })
                    : String(attempt.tryIndex),
              ),
            ),
        },
        {
          key: "result",
          title: columns.result,
          render: (_: unknown, attempt: Attempt) => {
            const view = resultView(attempt.result);
            return cell(status(toneOf[view.tone], view.label));
          },
        },
        { key: "payload", title: columns.payload, render: (_: unknown, attempt: Attempt) => cell(text("small", words.payload[attempt.payload])) },
        {
          key: "durationMs",
          title: columns.time,
          align: "end",
          render: (_: unknown, attempt: Attempt) =>
            cell(
              attempt.durationMs === null
                ? text("small", catalog.studio.flows.notRecorded, { mono: true, tone: "tertiary" })
                : text("small", formatMs(attempt.durationMs), { mono: true }),
            ),
        },
      ],
      data: run.attempts.map((attempt) => ({ ...attempt, key: attempt.id })),
    },
    config: { hoverable: true, bordered: false, rowClickable: true, ariaLabel: words.ledgerLabel },
    ref: (instance) => (instance as { onRowClick(handler: (record: Attempt) => void): void }).onRowClick((record) => onPick(record)),
  };
}

function payloadNode(attempt: Attempt, tab: string): Node {
  const payload = tab === "input" ? attempt.io.input : tab === "output" ? attempt.io.output : attempt.io.error;
  if (tab === "error" && !payload) return text("small", words.noError, { tone: "secondary" });
  return { tag: "xwui-code-block", data: { code: JSON.stringify(payload ?? {}, null, 2) }, config: { language: "json", copyable: true, showLineNumbers: false } };
}

function detail(run: RunDetail, attempt: Attempt, context: ViewContext): Node {
  const initial = attempt.result.kind === "failed" ? "input" : "output";
  return stack(
    [
      row(
        [
          text("h3", attempt.step),
          ...(attempt.tryIndex !== null && attempt.tryCount !== null
            ? [tag(fill(words.tryTag, { n: attempt.tryIndex, total: attempt.tryCount }), attempt.result.kind === "failed" ? "red" : undefined)]
            : []),
        ],
        { wrap: true },
      ),
      {
        tag: "xwui-tabs",
        data: { tabs: words.detailTabs.map((item) => ({ ...item })), activeTab: initial },
        config: { variant: "button", size: "sm", contentMode: "hidden" },
        ref: (instance) =>
          (instance as { onChange(handler: (id: string) => void): void }).onChange((id) => context.instance<XWUIComposer>("receipt-payload")?.setTree(payloadNode(attempt, id))),
      },
      row([tag(words.stored, "lime"), text("xs", fill(words.kept, { days: run.retentionDays, date: formatDate(run.expiresAt) }), { tone: "secondary" })], { wrap: true }),
      { tag: "xwui-composer", key: "receipt-payload", data: { tree: payloadNode(attempt, initial) } },
      text("xs", words.credentialsNote, { tone: "secondary" }),
      row(
        [
          button("primary", words.retryFrom, {
            size: "sm",
            onClick: async () => {
              try {
                const next = await api.startRun(run.flowId, "retry");
                notify(fill(words.retryStarted, { step: attempt.step }), "success");
                navigate(paths.run(next.id));
              } catch (error) {
                notify(errorMessage(error), "danger");
              }
            },
          }),
          button("glass", words.openStep, { size: "sm", onClick: () => navigate(paths.flow(run.flowId), { node: attempt.nodeId }) }),
        ],
        { wrap: true },
      ),
    ],
    { gap: "l" },
  );
}

export async function view(context: ViewContext<RunRoute>): Promise<PageResult> {
  const { route, workspace } = context;
  let run = await api.getRun(route.runId);
  let selectedId = route.attempt ?? defaultAttempt(run)?.id ?? null;
  const selected = (): Attempt | undefined => run.attempts.find((item) => item.id === selectedId) ?? run.attempts[0];

  const showDetail = (): void => {
    const attempt = selected();
    if (attempt) context.instance<XWUIComposer>("receipt-detail")?.setTree(detail(run, attempt, context));
  };
  const pick = (attempt: Attempt): void => {
    selectedId = attempt.id;
    replaceQuery(paths.run(run.id), { attempt: attempt.id });
    showDetail();
  };

  const page = (): Node => {
    const attempt = selected();
    return stack(
      [
        ...(run.status === "running" ? [{ tag: "xwui-alert", data: { message: words.running }, config: { variant: "info" } }] : []),
        hero(run),
        ...problem(run),
        timeline(run),
        {
          tag: "xwui-grid",
          // One column on a phone; minmax(0, ...) lets the ledger scroll inside its panel instead of widening the page.
          config: { columns: "minmax(0, 1fr)", gap: space("xl"), alignItems: "start", responsive: { lg: { columns: "minmax(0, 2fr) minmax(0, 1fr)" } } },
          slots: {
            children: [
              stack([text("h3", words.ledger), glass(ledger(run, pick), { pad: "none", scroll: true })], { gap: "m" }),
              glass({ tag: "xwui-composer", key: "receipt-detail", data: { tree: attempt ? detail(run, attempt, context) : stack([], { gap: "none" }) } }, { pad: "m", gradientBorder: true }),
            ],
          },
        },
      ],
      { gap: "xl" },
    );
  };

  if (run.status === "running") {
    const timer = setInterval(async () => {
      try {
        run = await api.getRun(run.id);
        if (run.status !== "running") {
          clearInterval(timer);
          selectedId = defaultAttempt(run)?.id ?? null;
        }
        context.instance<XWUIComposer>("receipt-page")?.setTree(page());
      } catch {
        clearInterval(timer);
      }
    }, config.pollMs);
    context.onLeave(() => clearInterval(timer));
  }

  return {
    bar: {
      crumbs: [{ label: workspace.project.name, href: href(paths.flows) }, { label: catalog.studio.runs.title, href: href(paths.runs) }, { label: run.flowName }],
      meta: run.id,
      sample: null,
      actions: [
        button("glass", words.compare, { size: "sm", onClick: () => navigate(paths.runs, { q: run.flowName, range: "all" }) }),
        button("glass", words.export, {
          size: "sm",
          onClick: async () => {
            try {
              await navigator.clipboard.writeText(JSON.stringify(run, null, 2));
              notify(words.exported, "success");
            } catch (error) {
              notify(errorMessage(error), "danger");
            }
          },
        }),
        button("gradient", words.showOnCanvas, { size: "sm", onClick: () => navigate(paths.flow(run.flowId), { node: selected()?.nodeId }) }),
      ],
    },
    body: [{ tag: "xwui-composer", key: "receipt-page", data: { tree: page() } }],
  };
}


