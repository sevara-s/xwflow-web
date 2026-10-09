import type { FlowCanvasModel, FlowNodeModel, XWFlowCanvasData } from "./XWFlowCanvas.types";

export function projectCanvas(data: XWFlowCanvasData): FlowCanvasModel {
  const nodes: FlowNodeModel[] = data.steps.map((step) => ({
    id: step.id,
    name: step.name,
    summary: step.summary,
    kind: step.kind,
    kindLabel: data.kindLabels[step.kind],
    selected: step.id === data.selectedId,
  }));
  return {
    nodes,
    emptyLabel: data.emptyLabel,
    listLabel: data.listLabel,
  };
}
