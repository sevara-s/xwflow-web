import type { ProcessStep, StepKind } from "../../types/domain";

export interface XWFlowCanvasData {
  steps: ProcessStep[];
  selectedId: string | null;
  kindLabels: Record<StepKind, string>;
  emptyLabel: string;
  listLabel: string;
  onSelect: (stepId: string) => void;
}

export interface FlowNodeModel {
  id: string;
  name: string;
  summary: string;
  kindLabel: string;
  kind: StepKind;
  selected: boolean;
}

export interface FlowCanvasModel {
  nodes: FlowNodeModel[];
  emptyLabel: string;
  listLabel: string;
}
