import type { CanvasEdge, CanvasNode, FlowGraph } from "../../types/domain";
import type { Bounds, CanvasInsets, Transform, WireGeometry } from "./XWFlowCanvas.types";

export const NODE_HEIGHT = 72;
const MIN_SCALE = 0.35;
const MAX_SCALE = 2;

export function nodeHeight(node: CanvasNode): number {
  return node.height ?? NODE_HEIGHT;
}

/** Vertical offsets of a node's output pins, spread evenly down its side. */
export function outputPins(node: CanvasNode): number[] {
  const height = nodeHeight(node);
  if (node.outputs <= 1) return [height / 2 - 2];
  return Array.from({ length: node.outputs }, (_, index) => Math.round((height * (index + 1)) / (node.outputs + 1)) - 8);
}

export function inputPin(node: CanvasNode): number {
  return nodeHeight(node) / 2 - 2;
}

export function graphBounds(graph: FlowGraph, nodeWidth: number): Bounds {
  const boxes = [
    ...graph.nodes.map((node) => ({ x: node.x, y: node.y, w: nodeWidth, h: nodeHeight(node) })),
    ...graph.frames.map((frame) => ({ x: frame.x, y: frame.y, w: frame.width, h: frame.height })),
    ...graph.notes.map((note) => ({ x: note.x, y: note.y, w: note.width, h: 60 })),
  ];
  if (!boxes.length) return { minX: 0, minY: 0, maxX: nodeWidth, maxY: NODE_HEIGHT };
  return {
    minX: Math.min(...boxes.map((box) => box.x)),
    minY: Math.min(...boxes.map((box) => box.y)),
    maxX: Math.max(...boxes.map((box) => box.x + box.w)),
    maxY: Math.max(...boxes.map((box) => box.y + box.h)),
  };
}

/** Centre the graph inside the free area of the viewport, never enlarging past `maxScale`. */
export function fitTransform(bounds: Bounds, width: number, height: number, insets: CanvasInsets, maxScale = 1): Transform {
  const pad = 24;
  const freeW = Math.max(1, width - insets.left - insets.right - pad * 2);
  const freeH = Math.max(1, height - insets.top - insets.bottom - pad * 2);
  const graphW = Math.max(1, bounds.maxX - bounds.minX);
  const graphH = Math.max(1, bounds.maxY - bounds.minY);
  const scale = clampScale(Math.min(maxScale, freeW / graphW, freeH / graphH));
  const x = insets.left + pad + (freeW - graphW * scale) / 2 - bounds.minX * scale;
  const y = insets.top + pad + (freeH - graphH * scale) / 2 - bounds.minY * scale;
  return { x, y, scale };
}

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Zoom by a factor around a point on screen, keeping that point still. */
export function zoomAt(transform: Transform, factor: number, cx: number, cy: number): Transform {
  const scale = clampScale(transform.scale * factor);
  const ratio = scale / transform.scale;
  return { scale, x: cx - (cx - transform.x) * ratio, y: cy - (cy - transform.y) * ratio };
}

function edgeId(edge: CanvasEdge): string {
  return `${edge.from}-${edge.to}-${edge.port ?? 0}`;
}

/** Wires leave the source's output pin and enter the target's input pin as a smooth curve. */
export function wireGeometry(graph: FlowGraph, nodeWidth: number): WireGeometry[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const wires: WireGeometry[] = [];
  for (const edge of graph.edges) {
    const source = byId.get(edge.from);
    const target = byId.get(edge.to);
    if (!source || !target) continue;
    const pins = outputPins(source);
    const from = { x: source.x + nodeWidth, y: source.y + pins[Math.min(edge.port ?? 0, pins.length - 1)] + 7 };
    const to = { x: target.x, y: target.y + inputPin(target) + 7 };
    const bend = Math.max(24, (to.x - from.x) / 2);
    const path =
      Math.abs(from.y - to.y) < 1
        ? `M${from.x} ${from.y} L${to.x} ${to.y}`
        : `M${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`;
    wires.push({
      id: edgeId(edge),
      path,
      from,
      to,
      label: edge.label ? { x: from.x + 12, y: from.y - 18, text: edge.label } : undefined,
    });
  }
  return wires;
}

/**
 * Tidy up: place nodes in columns by their distance from a trigger, and
 * spread each column vertically around the first node's row.
 */
export function tidyLayout(graph: FlowGraph, nodeWidth: number): Array<Pick<CanvasNode, "id" | "x" | "y">> {
  const incoming = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of graph.edges) incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  const depth = new Map<string, number>();
  const queue = graph.nodes.filter((node) => !incoming.get(node.id)).map((node) => node.id);
  for (const id of queue) depth.set(id, 0);
  while (queue.length) {
    const id = queue.shift() as string;
    for (const edge of graph.edges.filter((item) => item.from === id)) {
      const next = (depth.get(id) ?? 0) + 1;
      if ((depth.get(edge.to) ?? -1) < next) {
        depth.set(edge.to, next);
        queue.push(edge.to);
      }
    }
  }
  const origin = graph.nodes[0] ?? { x: 0, y: 0 };
  const columns = new Map<number, CanvasNode[]>();
  for (const node of graph.nodes) {
    const column = depth.get(node.id) ?? 0;
    columns.set(column, [...(columns.get(column) ?? []), node]);
  }
  const gapX = nodeWidth + 50;
  const gapY = NODE_HEIGHT + 60;
  const positions: Array<Pick<CanvasNode, "id" | "x" | "y">> = [];
  for (const [column, nodes] of columns) {
    nodes.forEach((node, index) => {
      positions.push({
        id: node.id,
        x: origin.x + column * gapX,
        y: Math.round(origin.y + (index - (nodes.length - 1) / 2) * gapY),
      });
    });
  }
  return positions;
}

/** Nodes as small boxes on a 0..1 square, for the minimap. */
export function minimapBoxes(graph: FlowGraph, nodeWidth: number): Array<{ id: string; x: number; y: number; w: number; h: number }> {
  const bounds = graphBounds({ ...graph, frames: [], notes: [] }, nodeWidth);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const size = Math.max(width, height);
  return graph.nodes.map((node) => ({
    id: node.id,
    x: (node.x - bounds.minX) / size,
    y: (node.y - bounds.minY + (size - height) / 2) / size,
    w: nodeWidth / size,
    h: nodeHeight(node) / size,
  }));
}

export function connectedPins(graph: FlowGraph): { inputs: Set<string>; outputs: Set<string> } {
  return {
    inputs: new Set(graph.edges.map((edge) => edge.to)),
    outputs: new Set(graph.edges.map((edge) => `${edge.from}:${edge.port ?? 0}`)),
  };
}
