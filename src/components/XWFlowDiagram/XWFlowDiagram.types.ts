import type { Attempt, CanvasEdge, SystemId, ViewStep } from "../../types/domain";

export type DiagramMode = "flowchart" | "swimlane" | "bpmn" | "sequence";

export interface XWFlowDiagramData {
  mode: DiagramMode;
  steps: ViewStep[];
  edges: CanvasEdge[];
  systems: Array<{ id: SystemId; name: string }>;
  /** Attempts of the run a sequence diagram is drawn from. */
  attempts: Attempt[];
  /** Words drawn inside the diagram. */
  labels: {
    title: string;
    yes: string;
    no: string;
    blackBox: string;
    automation: string;
    retryWait: string;
    notFound: string;
    alt: string;
    otherwise: string;
    noMessage: string;
    accepted: string;
    skipped: string;
    notRun: string;
  };
  /** Highlight one ledger row in the sequence. */
  selectedAttempt?: string | null;
}

export interface XWFlowDiagramConfig {
  /** Lane by system (default) or one lane per step group. */
  laneBy?: "system" | "group";
  className?: string;
}

export interface XWFlowDiagramEvents {
  /** A numbered ledger dot was chosen in the sequence. */
  attempt: (attemptId: string) => void;
}

export interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
