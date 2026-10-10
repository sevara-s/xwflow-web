import type { StepGroup } from "../../types/domain";

export type ThumbStyle =
  | "graph"
  | "flowchart"
  | "swimlane"
  | "bpmn"
  | "sequence"
  | "states"
  | "petri"
  | "boxes"
  | "tree"
  | "timeline"
  | "code"
  | "list"
  | "layers";

export interface ThumbStep {
  name: string;
  group: StepGroup;
}

export interface XWFlowNotationThumbData {
  /** Notation id from the gallery, e.g. "bpmn" or "uml-sequence". */
  notation: string;
  steps: ThumbStep[];
  /** Spoken description of the drawing. */
  label: string;
}

export type XWFlowNotationThumbConfig = { className?: string };
