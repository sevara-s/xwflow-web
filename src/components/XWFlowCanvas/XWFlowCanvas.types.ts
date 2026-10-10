import type { CanvasNode, FlowGraph, StatusTone } from "../../types/domain";

export interface CanvasNodeView {
  /** Shown under the name, e.g. "HTTP request". */
  typeLabel: string;
  icon: string;
  status?: { tone: StatusTone; label: string };
  /** Draws the type line as a warning, e.g. "Needs a connection". */
  warn?: boolean;
  failed?: boolean;
}

export interface XWFlowCanvasData {
  graph: FlowGraph;
  /** Presentation for each node, keyed by node id. */
  views: Record<string, CanvasNodeView>;
  selectedId: string | null;
  labels: {
    canvas: string;
    zoomIn: string;
    zoomOut: string;
    fit: string;
    tidy: string;
    minimap: string;
  };
}

export interface CanvasInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface XWFlowCanvasConfig {
  /** Node card width in pixels. */
  nodeWidth?: number;
  /** Read-only canvases cannot be dragged or zoomed. */
  readOnly?: boolean;
  /** Show zoom, fit and tidy tools. */
  tools?: boolean;
  minimap?: boolean;
  /** Space the fit leaves for floating panels. */
  insets?: Partial<CanvasInsets>;
  /** Fit never enlarges past this scale. */
  maxFitScale?: number;
  /** Fixed height for embedded canvases; full-bleed canvases fill their parent. */
  height?: number;
  className?: string;
}

export interface XWFlowCanvasEvents {
  select: (nodeId: string) => void;
  move: (nodeId: string, x: number, y: number) => void;
  tidy: (positions: Array<Pick<CanvasNode, "id" | "x" | "y">>) => void;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface WireGeometry {
  id: string;
  path: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  label?: { x: number; y: number; text: string };
}
