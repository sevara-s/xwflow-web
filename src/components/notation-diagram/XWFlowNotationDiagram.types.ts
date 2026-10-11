/** Headless schema types - safe for UI ports (no DOM imports). */
import type { XWUIComponentEventMap } from '../../xwui';

export type XWFlowNotationHue = 'lime' | 'cyan' | 'violet' | 'pink' | 'orange' | 'green' | 'amber' | 'red' | 'blue';

export type XWFlowNotationMode = 'flowchart' | 'swimlane' | 'bpmn' | 'sequence' | 'simulation';

/**
 * ISO 5807 shape of a step (BPMN maps terminal to a start event and decision to a gateway).
 * The simulation notation adds `create` (entities enter) and `dispose` (entities leave).
 */
export type XWFlowNotationShape = 'terminal' | 'process' | 'decision' | 'call' | 'io' | 'store' | 'create' | 'dispose';

export interface XWFlowNotationStep {
  id: string;
  name: string;
  shape: XWFlowNotationShape;
  hue: XWFlowNotationHue;
  /** Lane id (swimlane, BPMN). */
  lane?: string;
  disabled?: boolean;
  /** Simulation: the block kind under the name ("Create", "Process, 4 workers"). */
  subtitle?: string;
  /** Simulation: the live figure under the block ("121 out, 3 waiting"). */
  stat?: string;
  /** Simulation: entities waiting in front of the block, drawn as up to 5 dots. */
  queue?: number;
  /** Place the step in this column / row instead of the one derived from the edges. */
  col?: number;
  row?: number;
  /** BPMN: a boundary error event with this label. */
  error?: string;
  /** BPMN: a data store this step writes to, with this label. */
  store?: string;
}

export interface XWFlowNotationEdge {
  from: string;
  to: string;
  /** Text on the connector, already in the reader's language. */
  label?: string;
  /** "yes" draws the label in the accent, "no" muted. */
  tone?: 'yes' | 'no';
  dashed?: boolean;
}

export interface XWFlowNotationLane {
  id: string;
  name: string;
  hue: XWFlowNotationHue;
}

/** One row of a sequence diagram, top to bottom. */
export interface XWFlowNotationMessage {
  id: string;
  /** call: to a lane and back; in: from a lane into the actor; note: beside the actor; branch: an alt frame; skip: a dashed, muted call. */
  kind: 'call' | 'in' | 'note' | 'branch' | 'skip';
  label: string;
  /** The lane the message goes to (call, skip) or comes from (in). */
  lane?: string;
  /** The answer drawn on the way back (call). */
  reply?: string;
  failed?: boolean;
  /** Drawn as a self call after a failed call, e.g. "wait 1 s, retry". */
  retry?: string;
  hue: XWFlowNotationHue;
}

export interface XWFlowNotationDiagramConfig {
  /** Which notation to draw. Default flowchart. */
  mode?: XWFlowNotationMode;
  className?: string;
}

export interface XWFlowNotationDiagramData {
  /** Spoken name of the drawing; also the BPMN pool name. */
  title?: string;
  steps?: XWFlowNotationStep[];
  edges?: XWFlowNotationEdge[];
  lanes?: XWFlowNotationLane[];
  /** BPMN: the external participant drawn as a collapsed pool above. */
  external?: { name: string; note?: string } | null;
  /** Sequence: the rows, and the lane whose lifeline is the active actor. */
  messages?: XWFlowNotationMessage[];
  actor?: string;
  selectedMessage?: string | null;
  labels?: { alt?: string; message?: string; queue?: string };
  uid?: string;
}

export type XWFlowNotationDiagramEventMap = XWUIComponentEventMap & {
  /** A numbered sequence row was chosen. */
  select: { id: string };
};
