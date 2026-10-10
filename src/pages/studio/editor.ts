import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill, formatMs } from "../../app/format";
import type { Tracker } from "../../app/mount";
import { errorMessage, notify } from "../../app/notify";
import type { PageContext } from "../../app/page";
import { href, navigate, paths, replaceQuery, type Route } from "../../app/router";
import { flowStatusView, resultView } from "../../app/status";
import { XWFlowBrand } from "../../components/XWFlowBrand/XWFlowBrand";
import { XWFlowCanvas } from "../../components/XWFlowCanvas/XWFlowCanvas";
import { XWFlowStatus } from "../../components/XWFlowStatus/XWFlowStatus";
import { XWFlowStepIcon } from "../../components/XWFlowStepIcon/XWFlowStepIcon";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { Attempt, RunDetail } from "../../types/domain";
import { XWUIButton, XWUICodeBlock, XWUIInputText, XWUIKbd, XWUINavTabs, XWUITable } from "../../xwui";
import { canvasData } from "./canvas";
import { mountTag } from "./common";
import { renderInspector } from "./editor-inspector";
import "./editor.css";

type EditorRoute = Extract<Route, { page: "editor" }>;
type Owned = { destroy(): void };

const words = catalog.studio.editor;

export async function render(context: PageContext<EditorRoute>): Promise<void> {
  const { route, scope, body } = context;
  let detail = await api.getFlow(route.flowId);
  const [run, connections] = await Promise.all([detail.latestRunId ? api.getRun(detail.latestRunId) : Promise.resolve(null), api.getConnectionNames()]);
  let latest: RunDetail | null = run;
  let selectedId = route.node && detail.graph.nodes.some((node) => node.id === route.node) ? route.node : (latestFailure(latest)?.nodeId ?? detail.graph.nodes[1]?.id ?? detail.graph.nodes[0]?.id ?? null);
  let section = "params";
  let runTab = "ledger";

  document.title = `${detail.flow.name} · ${catalog.brand}`;
  scope.track({ destroy: () => (document.title = catalog.brand) });

  const root = el("div", "xwflow-editor");
  body.append(root);
  const canvasHost = slot(root, "xwflow-editor__canvas");
  const header = el("header", "xwflow-editor__float xwflow-editor__header");
  const palette = el("aside", "xwflow-editor__float xwflow-editor__palette");
  palette.setAttribute("aria-label", words.paletteLabel);
  const inspector = el("aside", "xwflow-editor__float xwflow-editor__inspector");
  inspector.setAttribute("aria-label", words.inspectorLabel);
  const runPanel = el("section", "xwflow-editor__float xwflow-editor__runs");
  runPanel.setAttribute("aria-label", words.runPanelLabel);
  root.append(header, palette, inspector, runPanel);

  /* ------------------------------------------------ header */
  const tagsHost = el("div", "xwflow-row xwflow-gap-8");
  const back = scope.track(new XWUIButton(slot(header), { text: "" }, { variant: "ghost", size: "sm", icon: "arrow-left", ariaLabel: words.back, title: words.back }));
  back.onClick(() => navigate(paths.flows));
  scope.track(new XWFlowBrand(slot(header), { label: catalog.brand, href: href(paths.home) }, { markOnly: true }));
  const crumbs = el("nav", "xwflow-editor__crumbs");
  crumbs.setAttribute("aria-label", "Breadcrumb");
  const projectLink = el("a", undefined, context.workspace.project.name);
  projectLink.href = href(paths.flows);
  crumbs.append(projectLink, el("span", undefined, "/"), el("b", undefined, detail.flow.name));
  header.append(crumbs, tagsHost);
  let tagOwned: Owned[] = [];
  scope.track({ destroy: () => tagOwned.splice(0).forEach((item) => item.destroy()) });
  const drawTags = (): void => {
    tagOwned.splice(0).forEach((item) => item.destroy());
    tagsHost.replaceChildren();
    const status = detail.flow.status;
    const tracker: Tracker = { track: (item) => (tagOwned.push(item), item) };
    if (status !== "draft") mountTag(slot(tagsHost), tracker, { label: catalog.studio.flowStatus.published, color: "lime" });
    if (status !== "published") mountTag(slot(tagsHost), tracker, { label: flowStatusView(status).label, color: status === "draft" ? "plain" : "amber" });
  };
  drawTags();

  const viewTabs = slot(header, "xwflow-tabs xwflow-editor__views");
  const tabs = scope.track(
    new XWUINavTabs(viewTabs, { tabs: words.views.map((item) => ({ ...item })), activeTab: "editor" }, { variant: "button", size: "sm", ariaLabel: words.viewsLabel, hideContent: "true" }),
  );
  tabs.onChange((id) => {
    if (id === "bpmn" || id === "3d") navigate(paths.flowView(detail.flow.id, id));
    else if (id === "all") navigate(paths.notations);
    else if (id === "runs") navigate(paths.runs, { q: detail.flow.name, range: "all" });
    else {
      notify(words.versionsSoon, "info");
      tabs.setActiveTab("editor");
    }
  });

  const headerActions = el("div", "xwflow-row xwflow-gap-8 xwflow-push");
  header.append(headerActions);
  const ask = scope.track(new XWUIButton(slot(headerActions), { text: words.askAi }, { variant: "ghost", size: "sm", icon: "sparkles", className: "xwflow-btn-glass" }));
  ask.onClick(() => navigate(paths.studio));
  const runHost = slot(headerActions);
  const runButton = scope.track(new XWUIButton(runHost, { text: words.run }, { variant: "ghost", size: "sm", icon: "play", className: "xwflow-btn-gradient" }));
  const runKeys = document.createElement("span");
  scope.track(new XWUIKbd(runKeys, { keys: words.runKeys }, { size: "sm" }));
  runHost.querySelector(".xwui-button")?.append(runKeys);
  const publish = scope.track(new XWUIButton(slot(headerActions), { text: words.publish }, { variant: "primary", size: "sm" }));
  publish.onClick(async () => {
    if (detail.flow.status === "published") {
      notify(words.nothingToPublish, "info");
      return;
    }
    try {
      detail.flow = await api.publishFlow(detail.flow.id);
      drawTags();
      notify(fill(words.published, { name: detail.flow.name }), "success");
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  });

  /* ------------------------------------------------ canvas */
  const canvas = scope.track(
    new XWFlowCanvas(canvasHost, canvasData(detail.graph, selectedId, latest?.attempts), {
      nodeWidth: 150,
      tools: true,
      minimap: true,
      insets: { top: 94, left: 282, right: 372, bottom: 282 },
      maxFitScale: 1.15,
      className: "xwflow-editor__board",
    }),
  );
  const redrawCanvas = (): void => canvas.setData(canvasData(detail.graph, selectedId, latest?.attempts));
  canvas.on("select", (nodeId) => {
    selectedId = nodeId;
    canvas.select(nodeId);
    replaceQuery(paths.flow(detail.flow.id), { node: nodeId });
    drawInspector();
    drawRunPanel();
  });
  canvas.on("move", (nodeId, x, y) => void api.moveSteps(detail.flow.id, [{ id: nodeId, x, y }]).catch((error) => notify(errorMessage(error), "danger")));
  canvas.on("tidy", async (positions) => {
    try {
      const nodes = await api.moveSteps(detail.flow.id, positions);
      detail.graph = { ...detail.graph, nodes };
      redrawCanvas();
      canvas.fit();
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  });

  /* ------------------------------------------------ palette */
  const searchRow = slot(palette, "xwflow-editor__search");
  const keys = document.createElement("span");
  scope.track(new XWUIKbd(keys, { keys: words.searchKeys }, { size: "sm" }));
  const search = scope.track(
    new XWUIInputText(searchRow, { placeholder: words.searchSteps }, { type: "search", leadingIcon: "search", ariaLabel: words.searchSteps, suffix: keys, fullWidth: true }),
  );
  const paletteList = el("div", "xwflow-editor__palette-list");
  palette.append(paletteList);
  let paletteOwned: Owned[] = [];
  scope.track({ destroy: () => paletteOwned.splice(0).forEach((item) => item.destroy()) });
  const drawPalette = (query: string): void => {
    paletteOwned.splice(0).forEach((item) => item.destroy());
    paletteList.replaceChildren();
    const q = query.trim().toLowerCase();
    let shown = 0;
    for (const group of detail.palette) {
      const items = group.items.filter((item) => !q || item.label.toLowerCase().includes(q));
      if (!items.length) continue;
      paletteList.append(el("div", "xwflow-editor__palette-group", group.label));
      for (const item of items) {
        shown += 1;
        const button = el("button", "xwflow-editor__palette-item");
        button.type = "button";
        const icon = el("span");
        button.append(icon, el("span", undefined, item.label));
        const type = catalog.studio.stepTypes[item.id as keyof typeof catalog.studio.stepTypes];
        paletteOwned.push(new XWFlowStepIcon(icon, { icon: type?.icon ?? catalog.studio.groupIcons[item.group], group: item.group }, { size: "sm" }));
        button.addEventListener("click", async () => {
          try {
            const node = await api.addStep(detail.flow.id, item);
            detail = await api.getFlow(detail.flow.id);
            selectedId = node.id;
            drawTags();
            redrawCanvas();
            drawInspector();
            notify(fill(words.added, { name: node.name }), "success");
          } catch (error) {
            notify(errorMessage(error), "danger");
          }
        });
        paletteList.append(button);
      }
    }
    if (!shown) paletteList.append(el("p", "xwflow-small xwflow-sec", words.noSteps));
  };
  search.onChange((value) => drawPalette(value));
  drawPalette("");

  /* ------------------------------------------------ inspector */
  let inspectorOwned: Owned[] = [];
  scope.track({ destroy: () => inspectorOwned.splice(0).forEach((item) => item.destroy()) });
  let rename: (() => void) | null = null;
  function drawInspector(): void {
    inspectorOwned.splice(0).forEach((item) => item.destroy());
    inspector.replaceChildren();
    rename = null;
    const node = detail.graph.nodes.find((item) => item.id === selectedId);
    if (!node) {
      inspector.append(el("p", "xwflow-small xwflow-sec", words.selectStep));
      return;
    }
    const handle = renderInspector(inspector, { track: (item) => (inspectorOwned.push(item), item) }, {
      detail,
      node,
      connections,
      section,
      sectionChanged: (next) => (section = next),
      changed: (updated, step) => {
        const index = detail.graph.nodes.findIndex((item) => item.id === updated.id);
        if (index !== -1) detail.graph.nodes[index] = updated;
        const stepIndex = detail.steps.findIndex((item) => item.nodeId === updated.id);
        if (stepIndex !== -1) detail.steps[stepIndex] = { ...step, nodeId: updated.id };
        else detail.steps.push({ ...step, nodeId: updated.id });
        if (detail.flow.status === "published") detail.flow = { ...detail.flow, status: "changed" };
        drawTags();
        redrawCanvas();
        crumbs.querySelector("b")!.textContent = detail.flow.name;
        if (updated.state !== node.state || updated.name !== node.name) drawInspector();
      },
      executeTo: () => void startTestRun(),
    });
    rename = handle.rename;
  }
  drawInspector();

  /* ------------------------------------------------ run panel */
  let runOwned: Owned[] = [];
  scope.track({ destroy: () => runOwned.splice(0).forEach((item) => item.destroy()) });
  function drawRunPanel(): void {
    runOwned.splice(0).forEach((item) => item.destroy());
    runPanel.replaceChildren();
    const local: Tracker = { track: (item) => (runOwned.push(item), item) };
    const head = el("div", "xwflow-row xwflow-gap-12 xwflow-wrap xwflow-editor__runs-head");
    runPanel.append(head);
    const tabHost = slot(head, "xwflow-tabs");
    const runTabs = local.track(new XWUINavTabs(tabHost, { tabs: words.runTabs.map((item) => ({ ...item })), activeTab: runTab }, { variant: "button", size: "sm", hideContent: "true" }));
    runTabs.onChange((id) => {
      runTab = id;
      drawRunPanel();
    });
    const content = el("div", "xwflow-editor__runs-body");
    if (!latest) {
      content.append(el("p", "xwflow-small xwflow-sec", words.noRun));
      runPanel.append(content);
      return;
    }
    const finished = latest.attempts.filter((item) => !["disabled", "notRun", "pinned"].includes(item.result.kind)).length;
    const disabled = latest.attempts.filter((item) => item.result.kind === "disabled").length;
    local.track(new XWFlowStatus(slot(head), { tone: "ok", label: fill(words.finished, { n: finished }) }));
    if (disabled) local.track(new XWFlowStatus(slot(head), { tone: "dis", label: fill(words.disabled, { n: disabled }) }));
    const receipt = local.track(new XWUIButton(slot(head, "xwflow-push"), { text: words.openReceipt }, { variant: "ghost", size: "sm", className: "xwflow-btn-glass" }));
    const runId = latest.id;
    receipt.onClick(() => navigate(paths.run(runId)));
    runPanel.append(content);

    const attempts = latest.attempts;
    const forNode = attempts.filter((item) => item.nodeId === selectedId);
    const focus = forNode.at(-1);
    if (runTab === "ledger") {
      mountMiniLedger(slot(content, "xwflow-table"), local, attempts.filter((item) => item.result.kind !== "notRun"), focus);
    } else if (runTab === "problems") {
      const problems = attempts.filter((item) => item.result.kind === "failed");
      if (!problems.length) content.append(el("p", "xwflow-small xwflow-sec", words.noProblems));
      for (const item of problems) local.track(new XWFlowStatus(slot(content), resultView(item.result, true)));
    } else {
      const payload = focus ? (runTab === "input" ? focus.io.input : focus.io.output) : {};
      local.track(new XWUICodeBlock(slot(content), { code: JSON.stringify(payload, null, 2) }, { language: "json", copyable: true }));
    }
  }
  drawRunPanel();

  /* ------------------------------------------------ running */
  async function startTestRun(): Promise<void> {
    try {
      runButton.setLoading(true);
      const started = await api.startRun(detail.flow.id, "test");
      notify(fill(words.runStarted, { id: started.id }), "info");
      const poll = setInterval(async () => {
        const next = await api.getRun(started.id);
        if (next.status === "running") return;
        clearInterval(poll);
        latest = next;
        runButton.setLoading(false);
        redrawCanvas();
        drawRunPanel();
        notify(fill(words.runFinished, { id: next.id, status: catalog.studio.runStatus[next.status].toLocaleLowerCase() }), next.status === "failed" ? "danger" : "success");
      }, config.pollMs / 3);
      scope.track({ destroy: () => clearInterval(poll) });
    } catch (error) {
      runButton.setLoading(false);
      notify(errorMessage(error), "danger");
    }
  }
  runButton.onClick(() => void startTestRun());

  const onKey = (event: KeyboardEvent): void => {
    const typing = (event.target as HTMLElement).closest("input, textarea, select, [contenteditable]");
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void startTestRun();
    } else if (event.key === "F2") {
      event.preventDefault();
      rename?.();
    } else if (!typing && event.key.toLowerCase() === "p" && selectedId) {
      inspector.querySelector<HTMLButtonElement>(".xwflow-btn-glass")?.click();
    }
  };
  document.addEventListener("keydown", onKey);
  scope.track({ destroy: () => document.removeEventListener("keydown", onKey) });
}

function latestFailure(run: RunDetail | null): Attempt | undefined {
  return run?.attempts.find((item) => item.result.kind === "failed");
}

function mountMiniLedger(host: HTMLElement, scope: Tracker, attempts: Attempt[], focus: Attempt | undefined): void {
  const columns = words.columns;
  host.dataset.density = "dense";
  scope.track(
    new XWUITable(
      host,
      {
        columns: [
          { key: "step", title: columns.step, render: (_: unknown, item: Attempt) => el("b", undefined, item.step) },
          {
            key: "try",
            title: columns.try,
            render: (_: unknown, item: Attempt) =>
              el(
                "span",
                undefined,
                item.tryIndex === null
                  ? catalog.studio.receipt.tryNone
                  : item.tryCount && item.tryCount > 1
                    ? fill(catalog.studio.receipt.tryOf, { n: item.tryIndex, total: item.tryCount })
                    : String(item.tryIndex),
              ),
          },
          {
            key: "result",
            title: columns.result,
            render: (_: unknown, item: Attempt) => {
              const box = el("div");
              scope.track(new XWFlowStatus(box, resultView(item.result, true), { size: "sm" }));
              return box;
            },
          },
          { key: "inCount", title: columns.in, align: "end" },
          { key: "outCount", title: columns.out, align: "end" },
          {
            key: "durationMs",
            title: columns.time,
            align: "end",
            render: (_: unknown, item: Attempt) =>
              item.durationMs === null ? el("span", "xwflow-mono xwflow-ter", catalog.studio.flows.notRecorded) : el("span", "xwflow-mono", formatMs(item.durationMs)),
          },
        ],
        data: attempts.map((item) => ({ ...item, key: item.id })),
      },
      { hoverable: true, bordered: false, ariaLabel: catalog.studio.receipt.ledgerLabel },
    ),
  );
  const index = focus ? attempts.findIndex((item) => item.id === focus.id) : -1;
  host.querySelectorAll("tbody tr").forEach((row, rowIndex) => row.classList.toggle("is-selected", rowIndex === index));
}
