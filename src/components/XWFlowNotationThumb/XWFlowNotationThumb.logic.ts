import type { ThumbStyle } from "./XWFlowNotationThumb.types";

const styles: Record<string, ThumbStyle> = {
  "node-graph": "graph",
  blueprint: "graph",
  dag: "graph",
  flowchart: "flowchart",
  epc: "flowchart",
  swimlane: "swimlane",
  bpmn: "bpmn",
  bpmn1: "bpmn",
  choreography: "bpmn",
  conversation: "bpmn",
  "uml-sequence": "sequence",
  "uml-activity": "states",
  "state-machine": "states",
  simulation: "petri",
  petri: "petri",
  dfd: "boxes",
  idef0: "boxes",
  vsm: "boxes",
  sipoc: "boxes",
  "decision-tree": "tree",
  timeline: "timeline",
  code: "code",
  list: "list",
  "3d": "layers",
};

/** Which drawing a notation uses. Unknown notations fall back to the node graph. */
export function thumbStyle(notation: string): ThumbStyle {
  return styles[notation] ?? "graph";
}

/** Trim a step name so it fits a small shape. */
export function shortName(name: string, max = 14): string {
  return name.length <= max ? name : `${name.slice(0, max - 1)}…`;
}

/** Mermaid-style text for the "flow as code" thumbnail: one edge per line. */
export function flowAsCode(names: string[]): string[] {
  const id = (index: number): string => String.fromCharCode(65 + index);
  const edges = names.slice(1).map((name, index) => `  ${id(index)}[${names[index]}] --> ${id(index + 1)}[${name}]`);
  return ["flowchart LR", ...edges].slice(0, 6);
}
