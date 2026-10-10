/**
 * Flow data as XWUI component data: canvas nodes and wires for
 * XWUIFlowCanvas / XWUIFlowScene, and app status tones as XWUIStatusGlyph tones.
 */
import { resultView } from "../app/status";
import { catalog } from "../content/catalog";
import type { Attempt, FlowGraph, StatusTone as AppTone, StepGroup } from "../types/domain";
import type { Hue, StatusTone } from "./kit";

const types = catalog.studio.stepTypes;

export const toneOf: Record<AppTone, StatusTone> = {
  ok: "success",
  err: "error",
  run: "running",
  idle: "neutral",
  warn: "warning",
  pin: "pinned",
  dis: "disabled",
};

export const hueOf: Record<StepGroup, Hue> = { trigger: "lime", control: "orange", data: "violet", ai: "pink", integration: "cyan" };

export function stepType(type: string, group: StepGroup): { label: string; icon: string } {
  return types[type as keyof typeof types] ?? { label: type, icon: catalog.studio.groupIcons[group] };
}

export interface CanvasStatus {
  tone: AppTone;
  label: string;
}

/** Last-run state of every node, as the editor shows it. */
export function nodeStatuses(graph: FlowGraph, attempts: Attempt[]): Record<string, CanvasStatus | undefined> {
  const out: Record<string, CanvasStatus | undefined> = {};
  for (const node of graph.nodes) {
    const tries = attempts.filter((item) => item.nodeId === node.id);
    const last = tries.at(-1);
    let status: CanvasStatus | undefined;
    if (node.state === "pinned") status = { tone: "pin", label: catalog.studio.editor.pinned };
    else if (last && last.tryIndex && last.tryCount && last.tryCount > 1 && last.result.kind === "succeeded") {
      status = { tone: "ok", label: `${catalog.studio.editor.try} ${last.tryIndex} of ${last.tryCount}` };
    } else if (last) status = resultView(last.result);
    else if (node.state === "disabled") status = { tone: "dis", label: catalog.studio.result.disabled };
    out[node.id] = attempts.length || node.state !== "normal" ? status : undefined;
  }
  return out;
}

/** XWUIFlowCanvas data for a graph: names, types, icons, hues, pins and statuses. */
export function canvasData(
  graph: FlowGraph,
  options: { selectedId?: string | null; attempts?: Attempt[]; statuses?: Record<string, CanvasStatus | undefined>; frames?: boolean } = {},
): Record<string, unknown> {
  const statuses = options.statuses ?? nodeStatuses(graph, options.attempts ?? []);
  const attempts = options.attempts ?? [];
  return {
    nodes: graph.nodes.map((node) => {
      const type = stepType(node.type, node.group);
      const status = statuses[node.id];
      const last = attempts.filter((item) => item.nodeId === node.id).at(-1);
      return {
        id: node.id,
        name: node.name,
        subtitle: type.label,
        icon: type.icon,
        hue: hueOf[node.group],
        x: node.x,
        y: node.y,
        height: node.height,
        state: node.state,
        outputs: node.outputs,
        input: node.group !== "trigger" || graph.edges.some((edge) => edge.to === node.id),
        status: status ? { tone: toneOf[status.tone], label: status.label } : undefined,
        warn: node.type === "needsConnection",
        failed: last?.result.kind === "failed",
      };
    }),
    edges: graph.edges.map((edge) => ({ from: edge.from, to: edge.to, port: edge.port, label: edge.label, style: edge.style })),
    notes: options.frames === false ? [] : graph.notes,
    frames: options.frames === false ? [] : graph.frames,
    selectedId: options.selectedId ?? null,
    labels: { ...catalog.studio.canvas },
  };
}
