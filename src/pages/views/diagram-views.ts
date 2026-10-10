import { el, slot } from "../../app/dom";
import { downloadText, toBpmnXml, toMermaidSequence, toPlantUmlSequence } from "../../app/exporters";
import { fill } from "../../app/format";
import { notify } from "../../app/notify";
import { navigate, paths, type NotationView } from "../../app/router";
import { XWFlowDiagram } from "../../components/XWFlowDiagram/XWFlowDiagram";
import type { DiagramMode, XWFlowDiagramData } from "../../components/XWFlowDiagram/XWFlowDiagram.types";
import { XWFlowShape } from "../../components/XWFlowShape/XWFlowShape";
import { catalog } from "../../content/catalog";
import { XWUIButton, XWUISelect, XWUITag } from "../../xwui";
import type { ViewContext } from "./view";

const words = catalog.views;

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function mount(context: ViewContext, mode: NotationView): void {
  const { view, stage, footer, scope } = context;
  const diagramMode = mode as DiagramMode;
  scope.track(new XWFlowShape(slot(stage), { kind: "halo" }, { size: 420, color: "violet", place: { left: "30%", top: "30%" } }));
  const host = slot(stage, "xwflow-views__diagram");
  let run = view.runs.find((item) => item.attempts.some((attempt) => attempt.result.kind === "failed")) ?? view.runs[0];
  let laneBy: "system" | "group" = "system";

  const data = (): XWFlowDiagramData => ({
    mode: diagramMode,
    steps: view.steps,
    edges: view.edges,
    systems: view.systems,
    attempts: run?.attempts ?? [],
    labels: { ...words.diagram, title: fill(words.titles[mode], { flow: view.flow.name }) },
    selectedAttempt: null,
  });
  const diagram = scope.track(new XWFlowDiagram(host, data(), { laneBy }));
  diagram.on("attempt", (attemptId) => {
    if (run) navigate(paths.run(run.id), { attempt: attemptId });
  });

  const fileBase = slug(view.flow.name);
  context.setExport(() => {
    downloadText(`${fileBase}-${mode}.svg`, diagram.toSvg(), "image/svg+xml");
    notify(fill(words.exported, { name: `${fileBase}-${mode}.svg` }), "success");
  });

  if (mode === "flowchart") {
    footer.append(el("b", "xwflow-small", words.flowchart.legendTitle));
    for (const item of words.flowchart.legend) footer.append(el("span", "xwflow-views__legend", item));
    footer.append(el("span", "xwflow-xs xwflow-sec xwflow-push", words.flowchart.note));
  }

  if (mode === "swimlane") {
    const lanes = new Set(view.steps.map((step) => step.system)).size;
    let handoffs = 0;
    for (const edge of view.edges) {
      const from = view.steps.find((step) => step.id === edge.from);
      const to = view.steps.find((step) => step.id === edge.to);
      if (from && to && from.system !== to.system) handoffs += 1;
    }
    const retries = run ? run.attempts.filter((attempt) => (attempt.tryIndex ?? 1) > 1).length : 0;
    for (const [label, value] of [
      [words.swimlane.lanes, lanes],
      [words.swimlane.handoffs, handoffs],
      [words.swimlane.retries, retries],
    ] as const) {
      const stat = el("span", "xwflow-views__stat");
      stat.append(el("b", "xwflow-display", String(value)), el("span", "xwflow-xs xwflow-sec", label));
      footer.append(stat);
    }
    const select = scope.track(
      new XWUISelect(slot(footer, "xwflow-push xwflow-toolbar__select"), { label: words.swimlane.laneBy, value: laneBy, options: words.swimlane.laneOptions.map((item) => ({ ...item })) }, {}),
    );
    select.onChange((value) => {
      laneBy = String(value) === "group" ? "group" : "system";
      diagram.destroy();
      host.replaceChildren();
      const next = scope.track(new XWFlowDiagram(host, data(), { laneBy }));
      next.on("attempt", (attemptId) => run && navigate(paths.run(run.id), { attempt: attemptId }));
    });
  }

  if (mode === "bpmn") {
    scope.track(
      new XWUISelect(slot(footer, "xwflow-toolbar__select"), { label: words.bpmn.version, value: words.bpmn.versions[0], options: words.bpmn.versions.map((value) => ({ value, label: value })) }, {}),
    );
    for (const item of words.bpmn.legend) footer.append(el("span", "xwflow-views__legend", item));
    scope.track(new XWUITag(slot(footer, "xwflow-push"), { label: words.bpmn.valid }, { size: "small", className: "xwflow-tag xwflow-tag--lime" }));
    const exportXml = scope.track(new XWUIButton(slot(footer), { text: words.bpmn.exportXml }, { variant: "ghost", size: "sm", className: "xwflow-btn-glass" }));
    exportXml.onClick(() => {
      downloadText(`${fileBase}.bpmn`, toBpmnXml(fileBase.replace(/-/g, "_"), view.flow.name, view.steps, view.edges), "application/xml");
      notify(fill(words.exported, { name: `${fileBase}.bpmn` }), "success");
    });
  }

  if (mode === "sequence") {
    const text = el("div", "xwflow-stack");
    text.append(el("b", "xwflow-small", words.sequence.title), el("span", "xwflow-xs xwflow-sec", words.sequence.hint));
    footer.append(text);
    if (!view.runs.length) footer.append(el("span", "xwflow-small xwflow-sec", words.sequence.noRuns));
    const select = scope.track(
      new XWUISelect(
        slot(footer, "xwflow-push xwflow-toolbar__select"),
        {
          label: words.sequence.run,
          value: run?.id ?? "",
          options: view.runs.map((item) => ({ value: item.id, label: fill(words.sequence.runOption, { id: item.id, mode: catalog.studio.runMode[item.mode].toLocaleLowerCase() }) })),
        },
        {},
      ),
    );
    select.onChange((value) => {
      run = view.runs.find((item) => item.id === String(value)) ?? run;
      diagram.setData(data());
    });
    const plant = scope.track(new XWUIButton(slot(footer), { text: words.sequence.plantUml }, { variant: "ghost", size: "sm", className: "xwflow-btn-glass" }));
    plant.onClick(() => {
      downloadText(`${fileBase}-${run?.id ?? "run"}.puml`, toPlantUmlSequence(run?.attempts ?? [], view.steps, view.systems), "text/plain");
      notify(fill(words.exported, { name: `${fileBase}-${run?.id ?? "run"}.puml` }), "success");
    });
    const mermaid = scope.track(new XWUIButton(slot(footer), { text: words.sequence.mermaid }, { variant: "ghost", size: "sm", className: "xwflow-btn-glass" }));
    mermaid.onClick(() => {
      downloadText(`${fileBase}-${run?.id ?? "run"}.mmd`, toMermaidSequence(run?.attempts ?? [], view.steps, view.systems), "text/plain");
      notify(fill(words.exported, { name: `${fileBase}-${run?.id ?? "run"}.mmd` }), "success");
    });
  }
}
