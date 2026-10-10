import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill, formatDate, formatMs, formatStampLong } from "../../app/format";
import type { Tracker } from "../../app/mount";
import { errorMessage, notify } from "../../app/notify";
import type { PageContext } from "../../app/page";
import { href, navigate, paths, replaceQuery, type Route } from "../../app/router";
import { resultView, runModeTag, runStatusView } from "../../app/status";
import { XWFlowGauge } from "../../components/XWFlowGauge/XWFlowGauge";
import { XWFlowShape } from "../../components/XWFlowShape/XWFlowShape";
import { XWFlowStatus } from "../../components/XWFlowStatus/XWFlowStatus";
import { XWFlowWaterfall } from "../../components/XWFlowWaterfall/XWFlowWaterfall";
import type { WaterfallRow } from "../../components/XWFlowWaterfall/XWFlowWaterfall.types";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { Attempt, RunDetail } from "../../types/domain";
import { XWUIButton, XWUICodeBlock, XWUINavTabs, XWUITable } from "../../xwui";
import { glass, heading, mountAppBar, mountTag, projectCrumb } from "./common";
import "./run.css";

type RunRoute = Extract<Route, { page: "run" }>;
type Owned = { destroy(): void };

const words = catalog.studio.receipt;

export async function render(context: PageContext<RunRoute>): Promise<void> {
  const { route, scope, body } = context;
  let run = await api.getRun(route.runId);

  const bar = mountAppBar(context, [projectCrumb(context), { label: catalog.studio.runs.title, href: href(paths.runs) }, { label: run.flowName }], {
    meta: run.id,
    sample: null,
  });
  const actions = bar.actions;
  const compare = scope.track(new XWUIButton(slot(actions), { text: words.compare }, { variant: "ghost", size: "sm", className: "xwflow-btn-glass" }));
  compare.onClick(() => navigate(paths.runs, { q: run.flowName, range: "all" }));
  const exporter = scope.track(new XWUIButton(slot(actions), { text: words.export }, { variant: "ghost", size: "sm", className: "xwflow-btn-glass" }));
  exporter.onClick(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(run, null, 2));
      notify(words.exported, "success");
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  });
  const canvas = scope.track(new XWUIButton(slot(actions), { text: words.showOnCanvas }, { variant: "ghost", size: "sm", className: "xwflow-btn-gradient" }));
  canvas.onClick(() => navigate(paths.flow(run.flowId), { node: selectedAttempt()?.nodeId }));

  const sections = el("div", "xwflow-stack xwflow-gap-24");
  body.append(sections);
  let owned: Owned[] = [];
  const tracker: Tracker = { track: (item) => (owned.push(item), item) };
  scope.track({ destroy: () => owned.splice(0).forEach((item) => item.destroy()) });

  let selectedId = route.attempt ?? defaultAttempt(run)?.id ?? null;
  function selectedAttempt(): Attempt | undefined {
    return run.attempts.find((item) => item.id === selectedId) ?? run.attempts[0];
  }

  const draw = (): void => {
    owned.splice(0).forEach((item) => item.destroy());
    sections.replaceChildren();
    renderHero(sections, tracker, run);
    renderProblem(sections, run);
    renderTimeline(sections, tracker, run);

    const split = el("div", "xwflow-receipt__split");
    sections.append(split);
    const ledger = el("section", "xwflow-stack xwflow-gap-12 xwflow-receipt__ledger");
    ledger.setAttribute("aria-label", words.ledger);
    split.append(ledger);
    heading(ledger, 2, "h3", words.ledger);
    const tableHost = slot(ledger, "xwflow-table");
    const detail = glass(split, { pad: "m", border: "gradient", className: "xwflow-stack xwflow-gap-16 xwflow-receipt__detail", label: words.detailLabel });

    const table = mountLedger(tableHost, tracker, run);
    const markRow = (): void => {
      const index = run.attempts.findIndex((item) => item.id === selectedAttempt()?.id);
      tableHost.querySelectorAll("tbody tr").forEach((row, rowIndex) => row.classList.toggle("is-selected", rowIndex === index));
    };
    markRow();
    let detailOwned: Owned[] = [];
    owned.push({ destroy: () => detailOwned.splice(0).forEach((item) => item.destroy()) });
    const drawDetail = (): void => {
      detailOwned.splice(0).forEach((item) => item.destroy());
      detail.replaceChildren();
      const attempt = selectedAttempt();
      if (attempt) renderDetail(detail, { track: (item) => (detailOwned.push(item), item) }, run, attempt);
    };
    drawDetail();
    table.onRowClick<Attempt>((record) => {
      selectedId = record.id;
      replaceQuery(paths.run(run.id), { attempt: record.id });
      markRow();
      drawDetail();
    });
  };

  draw();

  if (run.status === "running") {
    sections.prepend(el("div", "xwflow-band xwflow-small", words.running));
    const timer = setInterval(async () => {
      try {
        run = await api.getRun(run.id);
        if (run.status !== "running") {
          clearInterval(timer);
          selectedId = defaultAttempt(run)?.id ?? null;
        }
        draw();
      } catch {
        clearInterval(timer);
      }
    }, config.pollMs);
    scope.track({ destroy: () => clearInterval(timer) });
  }
}

/** The receipt opens on the first failure, or the first step. */
function defaultAttempt(run: RunDetail): Attempt | undefined {
  return run.attempts.find((item) => item.result.kind === "failed") ?? run.attempts[0];
}

function renderHero(parent: HTMLElement, scope: Tracker, run: RunDetail): void {
  const hero = glass(parent, { className: "xwflow-receipt__hero xwflow-clip" });
  scope.track(new XWFlowShape(slot(hero), { kind: "halo" }, { size: 260, color: run.status === "failed" ? "pink" : "lime", place: { left: "-40px", top: "-60px" } }));
  scope.track(
    new XWFlowGauge(
      slot(hero),
      {
        value: run.recordedSteps,
        total: run.stepCount,
        caption: words.recorded,
        label: fill(words.gauge, { n: run.recordedSteps, total: run.stepCount }),
      },
      { tone: run.status === "failed" ? "red" : run.status === "running" ? "cyan" : "green" },
    ),
  );
  const text = el("div", "xwflow-stack xwflow-gap-8 xwflow-receipt__title");
  hero.append(text);
  scope.track(new XWFlowStatus(slot(text), runStatusView(run.status), { className: "xwflow-status--lg" }));
  heading(text, 1, "h2", fill(words.title, { flow: run.flowName, n: run.number }));
  const tags = el("div", "xwflow-wrap xwflow-gap-8");
  text.append(tags);
  mountTag(slot(tags), scope, runModeTag(run.mode, true));
  mountTag(slot(tags), scope, { label: formatStampLong(run.startedAt), color: "plain" });
  const recorded = run.attempts.reduce((sum, item) => sum + (item.durationMs ?? 0), 0);
  mountTag(slot(tags), scope, { label: fill(words.recordedMs, { ms: formatMs(recorded) }), color: "plain" });
  mountTag(slot(tags), scope, { label: words.sample, color: "plan" });
}

function renderProblem(parent: HTMLElement, run: RunDetail): void {
  const problem = run.problem;
  if (!problem) return;
  const band = el("div", "xwflow-band");
  band.dataset.tone = "err";
  band.setAttribute("role", "status");
  let text = fill(words.problem, { step: problem.step, try: problem.tryIndex, tries: problem.tryCount, code: problem.code });
  if (problem.recovered) text += fill(words.recovered, { next: problem.tryIndex + 1 });
  const [before, after] = text.split(problem.step);
  const line = el("div");
  line.append(before, el("b", undefined, problem.step), after);
  band.append(line);
  parent.append(band);
}

function renderTimeline(parent: HTMLElement, scope: Tracker, run: RunDetail): void {
  const panel = glass(parent, { pad: "m", className: "xwflow-stack xwflow-gap-16", label: words.timeline });
  const head = el("div", "xwflow-row xwflow-gap-8");
  panel.append(head);
  heading(head, 2, "h3", words.timeline);
  const end = run.attempts.reduce((max, item) => Math.max(max, (item.offsetMs ?? 0) + (item.durationMs ?? 0)), 0);
  head.append(el("span", "xwflow-xs xwflow-ter xwflow-push", formatMs(0)), el("span", "xwflow-xs xwflow-ter", formatMs(end)));

  const sameStep = (attempt: Attempt) => run.attempts.filter((item) => item.nodeId === attempt.nodeId).length > 1;
  const rows: WaterfallRow[] = run.attempts.map((attempt) => {
    const kind = attempt.result.kind;
    const label = sameStep(attempt) && attempt.tryIndex ? `${attempt.step}, ${attempt.tryIndex}` : attempt.step;
    let caption = attempt.durationMs !== null ? formatMs(attempt.durationMs) : "";
    if (kind === "failed") caption = `${caption}, ${attempt.result.code}`;
    if (kind === "pinned") caption = words.timelineEdge.pinned;
    if (kind === "disabled") caption = words.timelineEdge.skipped;
    if (kind === "notRun") caption = words.timelineEdge.notRun;
    const timed = kind !== "disabled" && kind !== "notRun";
    return {
      id: attempt.id,
      label,
      startMs: timed ? attempt.offsetMs ?? 0 : null,
      durationMs: timed ? attempt.durationMs ?? 0 : null,
      caption,
      group: attempt.group,
      failed: kind === "failed",
      muted: !timed,
    };
  });
  scope.track(new XWFlowWaterfall(slot(panel), { rows, label: words.timeline }));
}

function mountLedger(host: HTMLElement, scope: Tracker, run: RunDetail): XWUITable {
  const columns = words.columns;
  const table = scope.track(
    new XWUITable(
      host,
      {
        columns: [
          { key: "index", title: columns.index, render: (_: unknown, __: Attempt, index: number) => el("span", "xwflow-mono xwflow-ter", String(index + 1)) },
          { key: "step", title: columns.step, render: (_: unknown, attempt: Attempt) => el("b", undefined, attempt.step) },
          {
            key: "try",
            title: columns.try,
            render: (_: unknown, attempt: Attempt) =>
              el(
                "span",
                undefined,
                attempt.tryIndex === null
                  ? words.tryNone
                  : attempt.tryCount && attempt.tryCount > 1
                    ? fill(words.tryOf, { n: attempt.tryIndex, total: attempt.tryCount })
                    : String(attempt.tryIndex),
              ),
          },
          {
            key: "result",
            title: columns.result,
            render: (_: unknown, attempt: Attempt) => {
              const box = el("div");
              scope.track(new XWFlowStatus(box, resultView(attempt.result)));
              return box;
            },
          },
          { key: "payload", title: columns.payload, render: (_: unknown, attempt: Attempt) => el("span", undefined, words.payload[attempt.payload]) },
          {
            key: "durationMs",
            title: columns.time,
            align: "end",
            render: (_: unknown, attempt: Attempt) =>
              attempt.durationMs === null
                ? el("span", "xwflow-mono xwflow-ter", catalog.studio.flows.notRecorded)
                : el("span", "xwflow-mono", formatMs(attempt.durationMs)),
          },
        ],
        data: run.attempts.map((attempt) => ({ ...attempt, key: attempt.id })),
      },
      { hoverable: true, bordered: false, rowClickable: true, ariaLabel: words.ledgerLabel },
    ),
  );
  return table;
}

function renderDetail(panel: HTMLElement, scope: Tracker, run: RunDetail, attempt: Attempt): void {
  const head = el("div", "xwflow-row xwflow-gap-8 xwflow-wrap");
  panel.append(head);
  heading(head, 2, "h3", attempt.step);
  if (attempt.tryIndex !== null && attempt.tryCount !== null) {
    const tone = attempt.result.kind === "failed" ? "red" : "plain";
    mountTag(slot(head), scope, { label: fill(words.tryTag, { n: attempt.tryIndex, total: attempt.tryCount }), color: tone });
  }

  const tabsHost = slot(panel);
  const stored = el("div", "xwflow-row xwflow-gap-8 xwflow-wrap");
  panel.append(stored);
  mountTag(slot(stored), scope, { label: words.stored, color: "lime" });
  stored.append(el("span", "xwflow-xs xwflow-sec", fill(words.kept, { days: run.retentionDays, date: formatDate(run.expiresAt) })));
  const codeHost = slot(panel, "xwflow-receipt__code");

  let code: Owned | null = null;
  const showPayload = (tab: string): void => {
    code?.destroy();
    codeHost.replaceChildren();
    const payload = tab === "input" ? attempt.io.input : tab === "output" ? attempt.io.output : attempt.io.error;
    if (tab === "error" && !payload) {
      codeHost.append(el("p", "xwflow-small xwflow-sec", words.noError));
      code = null;
      return;
    }
    code = new XWUICodeBlock(codeHost, { code: JSON.stringify(payload ?? {}, null, 2) }, { language: "json", copyable: true, showLineNumbers: false });
  };
  scope.track({ destroy: () => code?.destroy() });

  const initial = attempt.result.kind === "failed" ? "input" : "output";
  tabsHost.classList.add("xwflow-tabs");
  const tabs = scope.track(
    new XWUINavTabs(tabsHost, { tabs: words.detailTabs.map((tab) => ({ ...tab })), activeTab: initial }, { variant: "button", size: "sm", hideContent: "true" }),
  );
  tabs.onChange((id) => showPayload(id));
  showPayload(initial);

  panel.append(el("p", "xwflow-xs xwflow-sec", words.credentialsNote));
  const buttons = el("div", "xwflow-wrap xwflow-gap-8");
  panel.append(buttons);
  const retry = scope.track(new XWUIButton(slot(buttons), { text: words.retryFrom }, { variant: "primary", size: "sm" }));
  retry.onClick(async () => {
    try {
      const next = await api.startRun(run.flowId, "retry");
      notify(fill(words.retryStarted, { step: attempt.step }), "success");
      navigate(paths.run(next.id));
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  });
  const open = scope.track(new XWUIButton(slot(buttons), { text: words.openStep }, { variant: "ghost", size: "sm", className: "xwflow-btn-glass" }));
  open.onClick(() => navigate(paths.flow(run.flowId), { node: attempt.nodeId }));
}
