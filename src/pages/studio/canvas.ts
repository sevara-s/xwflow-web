import { resultView } from "../../app/status";
import type { CanvasNodeView, XWFlowCanvasData } from "../../components/XWFlowCanvas/XWFlowCanvas.types";
import { catalog } from "../../content/catalog";
import type { Attempt, FlowGraph } from "../../types/domain";

const types = catalog.studio.stepTypes;

/** Labels, icons and last-run state for every node, shared by the editor and previews. */
export function nodeViews(graph: FlowGraph, attempts: Attempt[] = []): Record<string, CanvasNodeView> {
  const views: Record<string, CanvasNodeView> = {};
  for (const node of graph.nodes) {
    const type = types[node.type as keyof typeof types] ?? { label: node.type, icon: catalog.studio.groupIcons[node.group] };
    const tries = attempts.filter((item) => item.nodeId === node.id);
    const last = tries.at(-1);
    let status: CanvasNodeView["status"];
    if (node.state === "pinned") status = { tone: "pin", label: catalog.studio.editor.pinned };
    else if (last && last.tryIndex && last.tryCount && last.tryCount > 1 && last.result.kind === "succeeded") {
      status = { tone: "ok", label: `${catalog.studio.editor.try} ${last.tryIndex} of ${last.tryCount}` };
    } else if (last) status = resultView(last.result);
    else if (node.state === "disabled") status = { tone: "dis", label: catalog.studio.result.disabled };
    views[node.id] = {
      typeLabel: type.label,
      icon: type.icon,
      status: attempts.length || node.state !== "normal" ? status : undefined,
      warn: node.type === "needsConnection",
      failed: last?.result.kind === "failed",
    };
  }
  return views;
}

export function canvasData(graph: FlowGraph, selectedId: string | null, attempts: Attempt[] = []): XWFlowCanvasData {
  return { graph, views: nodeViews(graph, attempts), selectedId, labels: { ...catalog.studio.canvas } };
}
