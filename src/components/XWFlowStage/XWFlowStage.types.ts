export interface StageProp {
  id: string;
  kind: "cube" | "orb";
  tone?: string;
  x: number;
  y: number;
  size?: number;
}

export interface StageNode {
  id: string;
  title: string;
  detail: string;
  tone: string;
  x: number;
  y: number;
  tilt: number;
}

export interface StageReceiptRow {
  label: string;
  value: string;
  tone: string;
}

export interface StageMetric {
  figure: string;
  title: string;
  detail: string;
  tone: string;
}

export interface StageKind {
  label: string;
  tone: string;
}

export interface XWFlowStageData {
  assurances: readonly string[];
  props: readonly StageProp[];
  prompt: { kicker: string; body: string; badge: string; x: number; y: number };
  nodes: readonly StageNode[];
  receipt: {
    title: string;
    sample: string;
    x: number;
    y: number;
    rows: readonly StageReceiptRow[];
  };
  controls: {
    zoomOut: string;
    zoomOutLabel: string;
    zoomIn: string;
    zoomInLabel: string;
    reset: string;
    resetLabel: string;
    run: string;
  };
  metrics: readonly StageMetric[];
  kinds: readonly StageKind[];
  nextKicker: string;
}

export interface StageWire {
  tone: string;
  d: string;
}
