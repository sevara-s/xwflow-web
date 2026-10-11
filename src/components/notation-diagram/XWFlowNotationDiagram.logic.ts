/**
 * Headless notation diagram: the selection, and the pure layout maths every
 * notation shares (columns along the edges, branch rows, connectors, extent).
 */
import { XWUIComponentLogic, type ComponentSchema } from '../../xwui';
import schema from './XWFlowNotationDiagram.json';
import type { XWFlowNotationDiagramConfig, XWFlowNotationDiagramData, XWFlowNotationDiagramEventMap, XWFlowNotationEdge, XWFlowNotationStep } from './XWFlowNotationDiagram.types';

export const COLUMN = 190;
export const LANE = 150;

export interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Column of each step: its longest distance from the first step along the edges. */
export function columns(steps: XWFlowNotationStep[], edges: XWFlowNotationEdge[]): Map<string, number> {
  const column = new Map<string, number>();
  if (!steps.length) return column;
  column.set(steps[0].id, 0);
  for (const step of steps) {
    const at = column.get(step.id) ?? 0;
    // A loop back into the same step (a retry) does not move anything.
    for (const edge of edges.filter((item) => item.from === step.id && item.to !== step.id)) column.set(edge.to, Math.max(column.get(edge.to) ?? 0, at + 1));
  }
  return column;
}

/** Rows for a flowchart: the branches of a decision fan up and down from the main row. */
export function branchRows(steps: XWFlowNotationStep[], edges: XWFlowNotationEdge[]): Map<string, number> {
  const row = new Map<string, number>(steps.map((step) => [step.id, 0]));
  for (const step of steps) {
    const out = edges.filter((edge) => edge.from === step.id && edge.to !== step.id);
    if (out.length > 1) out.forEach((edge, index) => row.set(edge.to, (row.get(step.id) ?? 0) + (index === 0 ? -1 : 1)));
    else if (out.length === 1 && row.get(out[0].to) === 0) row.set(out[0].to, row.get(step.id) ?? 0);
  }
  return row;
}

/** A box for every step, by column and by lane (or branch row). */
export function layout(
  steps: XWFlowNotationStep[],
  edges: XWFlowNotationEdge[],
  laneOf: (step: XWFlowNotationStep) => number,
  origin = { x: 120, y: 60 },
  cell = { column: COLUMN, lane: LANE, w: 150, h: 64 },
): Box[] {
  const column = columns(steps, edges);
  return steps.map((step) => ({
    id: step.id,
    x: origin.x + (step.col ?? column.get(step.id) ?? 0) * cell.column,
    y: origin.y + (step.row ?? laneOf(step)) * cell.lane,
    w: cell.w,
    h: cell.h,
  }));
}

/** An orthogonal connector from the right of one box to the left of another. */
export function connector(from: Box, to: Box): string {
  const x1 = from.x + from.w;
  const y1 = from.y + from.h / 2;
  const x2 = to.x;
  const y2 = to.y + to.h / 2;
  if (Math.abs(y1 - y2) < 1) return `M${x1} ${y1} L${x2 - 6} ${y2}`;
  const mid = x1 + (x2 - x1) / 2;
  return `M${x1} ${y1} L${mid} ${y1} L${mid} ${y2} L${x2 - 6} ${y2}`;
}

/** The size that fits every box with a margin. */
export function extent(boxes: Box[], margin = 60): { width: number; height: number } {
  return {
    width: Math.max(...boxes.map((box) => box.x + box.w), 400) + margin,
    height: Math.max(...boxes.map((box) => box.y + box.h), 200) + margin,
  };
}

export class XWFlowNotationDiagramLogic extends XWUIComponentLogic<XWFlowNotationDiagramData, XWFlowNotationDiagramConfig, XWFlowNotationDiagramEventMap> {
  constructor(data: XWFlowNotationDiagramData = {}, config: XWFlowNotationDiagramConfig = {}) {
    super(schema as ComponentSchema, data, config);
  }

  /** Mark a sequence row and announce it. */
  select(id: string): void {
    if (!(this.data.messages ?? []).some((message) => message.id === id)) return;
    this.updateData({ selectedMessage: id });
    this.emit('select', { id });
  }
}

export function createXWFlowNotationDiagramLogic(data: XWFlowNotationDiagramData = {}, config: XWFlowNotationDiagramConfig = {}) {
  return new XWFlowNotationDiagramLogic(data, config);
}
