import type { CanvasEdge, ViewStep } from "../../types/domain";
import type { Box } from "./XWFlowDiagram.types";

export const COLUMN = 190;
export const LANE = 150;

/** Column of each step: its distance from the trigger along the edges. */
export function columns(steps: ViewStep[], edges: CanvasEdge[]): Map<string, number> {
  const column = new Map<string, number>();
  if (!steps.length) return column;
  column.set(steps[0].id, 0);
  for (const step of steps) {
    const at = column.get(step.id) ?? 0;
    for (const edge of edges.filter((item) => item.from === step.id)) {
      column.set(edge.to, Math.max(column.get(edge.to) ?? 0, at + 1));
    }
  }
  return column;
}

/** Rows for the plain flowchart: branches of a decision fan up and down from the main row. */
export function branchRows(steps: ViewStep[], edges: CanvasEdge[]): Map<string, number> {
  const row = new Map<string, number>(steps.map((step) => [step.id, 0]));
  for (const step of steps) {
    const out = edges.filter((edge) => edge.from === step.id);
    if (out.length > 1) {
      out.forEach((edge, index) => row.set(edge.to, (row.get(step.id) ?? 0) + (index === 0 ? -1 : 1)));
    } else if (out.length === 1 && row.get(out[0].to) === 0) {
      row.set(out[0].to, row.get(step.id) ?? 0);
    }
  }
  return row;
}

/** Boxes for every step, laid out by column and by lane (or branch row). */
export function layout(steps: ViewStep[], edges: CanvasEdge[], laneOf: (step: ViewStep) => number, origin = { x: 120, y: 60 }): Box[] {
  const column = columns(steps, edges);
  return steps.map((step) => ({
    id: step.id,
    x: origin.x + (column.get(step.id) ?? 0) * COLUMN,
    y: origin.y + laneOf(step) * LANE,
    w: 150,
    h: 64,
  }));
}

/** Orthogonal connector from the right side of one box to the left side of another. */
export function connector(from: Box, to: Box): string {
  const x1 = from.x + from.w;
  const y1 = from.y + from.h / 2;
  const x2 = to.x;
  const y2 = to.y + to.h / 2;
  if (Math.abs(y1 - y2) < 1) return `M${x1} ${y1} L${x2 - 6} ${y2}`;
  const mid = x1 + (x2 - x1) / 2;
  return `M${x1} ${y1} L${mid} ${y1} L${mid} ${y2} L${x2 - 6} ${y2}`;
}

/** Diagram size that fits every box with a margin. */
export function extent(boxes: Box[], margin = 60): { width: number; height: number } {
  return {
    width: Math.max(...boxes.map((box) => box.x + box.w), 400) + margin,
    height: Math.max(...boxes.map((box) => box.y + box.h), 200) + margin,
  };
}
