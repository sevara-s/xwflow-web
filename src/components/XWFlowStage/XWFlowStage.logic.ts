import type { StageNode, StageWire, XWFlowStageData } from "./XWFlowStage.types";

const zoomRange = { min: 0.84, max: 1.22, step: 0.08, initial: 1 };

export function initialZoom(): number {
  return zoomRange.initial;
}

export function nextZoom(current: number, direction: -1 | 0 | 1): number {
  if (direction === 0) return zoomRange.initial;
  const next = current + direction * zoomRange.step;
  return Math.min(zoomRange.max, Math.max(zoomRange.min, Math.round(next * 100) / 100));
}

function curve(from: StageNode, to: StageNode, bendX: number, bendY: number): string {
  const cx = (from.x + to.x) / 2 + bendX;
  const cy = (from.y + to.y) / 2 + bendY;
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
}

function ribbon(node: StageNode): string {
  const x = node.x;
  const y = node.y;
  return `M ${x + 3} ${y + 4} C ${x + 18} ${y + 8}, ${x + 24} ${y + 30}, ${x + 8} ${y + 38} C ${x - 6} ${y + 44}, ${x - 8} ${y + 20}, ${x + 1} ${y + 6}`;
}

export function projectWires(data: XWFlowStageData): StageWire[] {
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  const lookup = byId.get("lookup");
  const decision = byId.get("decision");
  const log = byId.get("log");
  const notify = byId.get("notify");
  const wires: StageWire[] = [];
  if (lookup) {
    wires.push({
      tone: "dash",
      d: `M ${data.prompt.x + 16} ${data.prompt.y + 10} C ${lookup.x - 14} ${lookup.y + 8}, ${lookup.x - 8} ${lookup.y}, ${lookup.x} ${lookup.y}`,
    });
  }
  if (lookup && decision) wires.push({ tone: "cyan", d: curve(lookup, decision, 2, -14) });
  if (decision) wires.push({ tone: "warm", d: ribbon(decision) });
  if (decision && log) wires.push({ tone: "violet", d: curve(decision, log, 4, 6) });
  if (decision && notify) wires.push({ tone: "green", d: curve(decision, notify, 8, -8) });
  return wires;
}

export function railCopies<T>(items: readonly T[]): T[] {
  return [...items, ...items];
}
