import { api } from "../../api/client";
import { fill, formatMs } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { href, navigate, paths, replaceQuery, type Route } from "../../app/router";
import { flowStatusView, resultView } from "../../app/status";
import type { PageResult, ViewContext } from "../../app/view";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { Attempt, FlowDetail, RunDetail } from "../../types/domain";
import { canvasData, hueOf, toneOf } from "../../ui/flow";
import { button, cell, keys, row, space, stack, status, tag, text, type Node } from "../../ui/kit";
import type { XWUIButton, XWUIComposer, XWUIFlowCanvas, XWUIInputText } from "../../xwui";
import { inspector, pinToggle, type InspectorContext } from "./editor-inspector";

type EditorRoute = Extract<Route, { page: "editor" }>;

const words = catalog.studio.editor;

/** Panel sizes; the canvas fit keeps clear of them. */
// Pixel numbers for the canvas insets below; the gap is the scale's 16 the workbench uses.
const PANEL = { gap: 16, header: 62, start: 250, end: 340, bottom: 250 } as const;

/** A press that moves further than this is a drag, not a click. */
const CLICK_SLOP = 4;

/** The id of the canvas step card an event started on, if any. */
function stepUnder(target: EventTarget | null): string | undefined {
  return (target as Element | null)?.closest<HTMLElement>(".xwui-flow-canvas__node")?.dataset.id;
}

function latestFailure(run: RunDetail | null): Attempt | undefined {
  return run?.attempts.find((item) => item.result.kind === "failed");
}

function statusTags(detail: FlowDetail): Node {
  const state = detail.flow.status;
  return row(
    [
      ...(state !== "draft" ? [tag(catalog.studio.flowStatus.published, "lime")] : []),
      ...(state !== "published" ? [tag(flowStatusView(state).label, state === "draft" ? undefined : "amber")] : []),
    ],
    { gap: "s" },
  );
}

function palette(detail: FlowDetail, query: string, add: (item: FlowDetail["palette"][number]["items"][number]) => void): Node {
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

function runBody(latest: RunDetail | null, tab: string, selectedId: string | null): Node {
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

export async function view(context: ViewContext<EditorRoute>): Promise<PageResult> {
  const { route, workspace } = context;
  let detail = await api.getFlow(route.flowId);
  const [run, connections] = await Promise.all([detail.latestRunId ? api.getRun(detail.latestRunId) : Promise.resolve(null), api.getConnectionNames()]);
  let latest: RunDetail | null = run;
  let selectedId =
    route.node && detail.graph.nodes.some((node) => node.id === route.node) ? route.node : (latestFailure(latest)?.nodeId ?? detail.graph.nodes[1]?.id ?? detail.graph.nodes[0]?.id ?? null);
  let section = "params";
  let runTab = "ledger";
  let paletteQuery = "";
  let nameField: XWUIInputText | null = null;

  document.title = `${detail.flow.name} · ${catalog.brand}`;
  context.onLeave(() => (document.title = catalog.brand));

  const part = <T,>(key: string): T | undefined => context.instance<T>(key);
  const canvas = (): XWUIFlowCanvas | undefined => part<XWUIFlowCanvas>("editor-canvas");
  const redrawCanvas = (): void => canvas()?.setData(canvasData(detail.graph, { selectedId, attempts: latest?.attempts }));
  const redrawTags = (): void => {
    part<XWUIComposer>("editor-tags")?.setTree(statusTags(detail));
    part<XWUIComposer>("editor-crumb")?.setTree(text("small", detail.flow.name, { bold: true }));
  };

  const inspectorContext = (): InspectorContext | null => {
    const node = detail.graph.nodes.find((item) => item.id === selectedId);
    if (!node) return null;
    return {
      detail,
      node,
      connections,
      section,
      sectionChanged: (next) => (section = next),
      showSection: (body) => part<XWUIComposer>("inspector-section")?.setTree(body),
      nameField: (input) => (nameField = input),
      changed: (updated, step) => {
        const index = detail.graph.nodes.findIndex((item) => item.id === updated.id);
        if (index !== -1) detail.graph.nodes[index] = updated;
        const stepIndex = detail.steps.findIndex((item) => item.nodeId === updated.id);
        if (stepIndex !== -1) detail.steps[stepIndex] = { ...step, nodeId: updated.id };
        else detail.steps.push({ ...step, nodeId: updated.id });
        if (detail.flow.status === "published") detail.flow = { ...detail.flow, status: "changed" };
        redrawTags();
        redrawCanvas();
        if (updated.state !== node.state || updated.name !== node.name) drawInspector();
      },
      executeTo: () => void startTestRun(),
    };
  };
  const inspectorTree = (): Node => {
    const ctx = inspectorContext();
    return ctx ? inspector(ctx) : text("small", words.selectStep, { tone: "secondary" });
  };
  function drawInspector(): void {
    part<XWUIComposer>("editor-inspector")?.setTree(inspectorTree());
  }

  const runHead = (): Node => {
    if (!latest) return row([]);
    const finished = latest.attempts.filter((item) => !["disabled", "notRun", "pinned"].includes(item.result.kind)).length;
    const disabled = latest.attempts.filter((item) => item.result.kind === "disabled").length;
    const runId = latest.id;
    return row(
      [
        status("success", fill(words.finished, { n: finished })),
        ...(disabled ? [status("disabled", fill(words.disabled, { n: disabled }))] : []),
        button("glass", words.openReceipt, { size: "sm", onClick: () => navigate(paths.run(runId)) }),
      ],
      { gap: "m", wrap: true },
    );
  };
  const drawRunPanel = (): void => {
    part<XWUIComposer>("editor-run-head")?.setTree(runHead());
    part<XWUIComposer>("editor-run-body")?.setTree(runBody(latest, runTab, selectedId));
  };

  const addStep = async (item: FlowDetail["palette"][number]["items"][number]): Promise<void> => {
    try {
      const node = await api.addStep(detail.flow.id, item);
      detail = await api.getFlow(detail.flow.id);
      selectedId = node.id;
      redrawTags();
      redrawCanvas();
      canvas()?.fit();
      drawInspector();
      notify(fill(words.added, { name: node.name }), "success");
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  };

  let polling: ReturnType<typeof setInterval> | undefined;
  context.onLeave(() => clearInterval(polling));
  async function startTestRun(): Promise<void> {
    const runButton = part<XWUIButton>("editor-run");
    try {
      runButton?.setLoading(true);
      const started = await api.startRun(detail.flow.id, "test");
      notify(fill(words.runStarted, { id: started.id }), "info");
      clearInterval(polling);
      polling = setInterval(async () => {
        const next = await api.getRun(started.id);
        if (next.status === "running") return;
        clearInterval(polling);
        latest = next;
        part<XWUIButton>("editor-run")?.setLoading(false);
        redrawCanvas();
        drawRunPanel();
        notify(fill(words.runFinished, { id: next.id, status: catalog.studio.runStatus[next.status].toLocaleLowerCase() }), next.status === "failed" ? "danger" : "success");
      }, config.pollMs / 3);
    } catch (error) {
      runButton?.setLoading(false);
      notify(errorMessage(error), "danger");
    }
  }

  const onKey = (event: KeyboardEvent): void => {
    const typing = (event.target as HTMLElement).closest("input, textarea, select, [contenteditable]");
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void startTestRun();
    } else if (event.key === "F2") {
      event.preventDefault();
      if (!nameField) {
        section = "settings";
        drawInspector();
        part<{ setActiveTab(id: string): void }>("inspector-tabs")?.setActiveTab("settings");
      }
      setTimeout(() => nameField?.focus(), 50);
    } else if (!typing && event.key.toLowerCase() === "p") {
      const ctx = inspectorContext();
      if (ctx) void pinToggle(ctx);
    }
  };
  document.addEventListener("keydown", onKey);
  context.onLeave(() => document.removeEventListener("keydown", onKey));

  const header = row(
    [
      row(
        [
          button("ghost", "", { icon: "arrow-left", size: "sm", label: words.back, onClick: () => navigate(paths.flows) }),
          { tag: "xwui-logo", data: {}, config: { svgPath: config.logoPath, logoConfig: "logo", title: catalog.brand, size: "xs", href: href(paths.home) } },
          row(
            [
              button("ghost", workspace.project.name, { size: "sm", href: href(paths.flows) }),
              text("small", "/", { tone: "tertiary" }),
              { tag: "xwui-composer", key: "editor-crumb", data: { tree: text("small", detail.flow.name, { bold: true }) } },
            ],
            { gap: "s" },
          ),
          { tag: "xwui-composer", key: "editor-tags", data: { tree: statusTags(detail) } },
        ],
        { gap: "m" },
      ),
      {
        tag: "xwui-tabs",
        data: { tabs: words.views.map((item) => ({ ...item })), activeTab: "editor" },
        config: { variant: "button", size: "sm", ariaLabel: words.viewsLabel, contentMode: "hidden" },
        ref: (instance) => {
          const tabs = instance as { onChange(handler: (id: string) => void): void };
          tabs.onChange((id) => {
            if (id === "bpmn" || id === "3d") navigate(paths.flowView(detail.flow.id, id));
            else if (id === "all") navigate(paths.notations);
            else if (id === "runs") navigate(paths.runs, { q: detail.flow.name, range: "all" });
            else if (id === "versions") navigate(paths.versions(detail.flow.id));
          });
        },
      },
      row(
        [
          button("glass", words.askAi, { size: "sm", icon: "sparkles", onClick: () => navigate(paths.studio) }),
          row([button("gradient", words.run, { size: "sm", icon: "play", key: "editor-run", onClick: () => void startTestRun() }), keys(words.runKeys.split(" "), "sm")], { gap: "s" }),
          button("primary", words.publish, {
            size: "sm",
            onClick: async () => {
              if (detail.flow.status === "published") return notify(words.nothingToPublish, "info");
              try {
                detail.flow = await api.publishFlow(detail.flow.id);
                redrawTags();
                notify(fill(words.published, { name: detail.flow.name }), "success");
              } catch (error) {
                notify(errorMessage(error), "danger");
              }
            },
          }),
        ],
        { gap: "s" },
      ),
    ],
    { gap: "m", justify: "space-between", wrap: true },
  );

  const start = stack(
    [
      {
        tag: "xwui-input-text",
        data: { placeholder: words.searchSteps },
        config: { type: "search", leadingIcon: "search", ariaLabel: words.searchSteps, suffix: words.searchKeys, fullWidth: true },
        ref: (instance) =>
          (instance as XWUIInputText).onChange((value: string) => {
            paletteQuery = value;
            part<XWUIComposer>("editor-palette")?.setTree(palette(detail, paletteQuery, (item) => void addStep(item)));
          }),
      },
      { tag: "xwui-composer", key: "editor-palette", data: { tree: palette(detail, paletteQuery, (item) => void addStep(item)) } },
    ],
    { gap: "m" },
  );

  const bottom = stack(
    [
      row(
        [
          {
            tag: "xwui-tabs",
            data: { tabs: words.runTabs.map((item) => ({ ...item })), activeTab: runTab },
            config: { variant: "button", size: "sm", contentMode: "hidden" },
            ref: (instance) =>
              (instance as { onChange(handler: (id: string) => void): void }).onChange((id) => {
                runTab = id;
                drawRunPanel();
              }),
          },
          { tag: "xwui-composer", key: "editor-run-head", data: { tree: runHead() } },
        ],
        { gap: "m", justify: "space-between", wrap: true },
      ),
      { tag: "xwui-composer", key: "editor-run-body", data: { tree: runBody(latest, runTab, selectedId) } },
    ],
    { gap: "s" },
  );

  let pressed: { id: string | undefined; x: number; y: number } | null = null;
  const stage: Node = {
    tag: "xwui-flow-canvas",
    key: "editor-canvas",
    data: canvasData(detail.graph, { selectedId, attempts: latest?.attempts }),
    config: {
      nodeWidth: 150,
      tools: true,
      minimap: true,
      flush: true,
      maxFitScale: 1.15,
      insets: {
        top: PANEL.gap * 2 + PANEL.header,
        left: PANEL.gap * 2 + PANEL.start,
        right: PANEL.gap * 2 + PANEL.end,
        bottom: PANEL.gap * 2 + PANEL.bottom,
      },
    },
    // The published XWUIFlowCanvas captures the pointer on its viewport, so Chrome
    // sends a mouse click to the viewport, not the step card, and the canvas
    // selects nothing (README, known issues). The step under the press is kept
    // and selected through the canvas's public select() when that happens.
    on: {
      pointerdown: (event) => {
        const pointer = event as PointerEvent;
        pressed = { id: stepUnder(event.target), x: pointer.clientX, y: pointer.clientY };
      },
      click: (event, instance) => {
        const press = pressed;
        pressed = null;
        const click = event as MouseEvent;
        if (!press?.id || stepUnder(event.target)) return;
        if (Math.hypot(click.clientX - press.x, click.clientY - press.y) > CLICK_SLOP) return;
        (instance as XWUIFlowCanvas).select(press.id);
      },
    },
    ref: (instance) => {
      const board = instance as XWUIFlowCanvas;
      // The canvas marks the clicked card itself; selecting again would re-emit.
      board.on("select", (({ id: nodeId }: { id: string }) => {
        selectedId = nodeId;
        replaceQuery(paths.flow(detail.flow.id), { node: nodeId });
        drawInspector();
        drawRunPanel();
      }) as never);
      board.on("move", (({ id, x, y }: { id: string; x: number; y: number }) =>
        void api.moveSteps(detail.flow.id, [{ id, x, y }]).catch((error) => notify(errorMessage(error), "danger"))) as never);
      board.on("tidy", (async ({ positions }: { positions: Array<{ id: string; x: number; y: number }> }) => {
        try {
          const nodes = await api.moveSteps(detail.flow.id, positions);
          detail.graph = { ...detail.graph, nodes };
          redrawCanvas();
          board.fit();
        } catch (error) {
          notify(errorMessage(error), "danger");
        }
      }) as never);
    },
  };

  return {
    body: [
      // The workbench shows the flow's name in its bar; screen readers get the page's h1.
      text("h2", fill(words.title, { flow: detail.flow.name }), { level: 1, hidden: true }),
      {
        tag: "xwui-workbench",
        data: { labels: { start: words.paletteLabel, end: words.inspectorLabel, bottom: words.runPanelLabel } },
        config: { startWidth: PANEL.start, endWidth: PANEL.end, bottomHeight: PANEL.bottom },
        slots: {
          stage,
          header,
          start,
          end: { tag: "xwui-composer", key: "editor-inspector", data: { tree: inspectorTree() } },
          bottom: { tag: "xwui-box", config: { padding: space("m") }, slots: { children: bottom } },
        },
      },
    ],
  };
}

