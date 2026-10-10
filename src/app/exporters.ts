import type { Attempt, CanvasEdge, SystemId, ViewStep } from "../types/domain";

function xml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function bpmnElement(step: ViewStep, index: number): string {
  const name = xml(step.name);
  if (index === 0 || step.group === "trigger") return `    <bpmn:startEvent id="${step.id}" name="${name}"><bpmn:messageEventDefinition /></bpmn:startEvent>`;
  if (step.type === "condition" || step.outputs > 1) return `    <bpmn:exclusiveGateway id="${step.id}" name="${name}" />`;
  if (step.type === "http") return `    <bpmn:serviceTask id="${step.id}" name="${name}" />`;
  if (step.type === "message" || step.type === "needsConnection") return `    <bpmn:sendTask id="${step.id}" name="${name}" />`;
  return `    <bpmn:task id="${step.id}" name="${name}" />`;
}

/** A BPMN 2.0 process for the flow: start event, tasks, gateways, flows and an end event. */
export function toBpmnXml(processId: string, name: string, steps: ViewStep[], edges: CanvasEdge[]): string {
  const leaves = steps.filter((step) => !edges.some((edge) => edge.from === step.id));
  const flows = [
    ...edges.map(
      (edge, index) =>
        `    <bpmn:sequenceFlow id="flow_${index + 1}" sourceRef="${edge.from}" targetRef="${edge.to}"${edge.label ? ` name="${xml(edge.label)}"` : ""} />`,
    ),
    ...leaves.map((step, index) => `    <bpmn:sequenceFlow id="flow_end_${index + 1}" sourceRef="${step.id}" targetRef="${processId}_end" />`),
  ];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="definitions" targetNamespace="https://xwflow.dev/bpmn">',
    `  <bpmn:process id="${processId}" name="${xml(name)}" isExecutable="true">`,
    ...steps.map(bpmnElement),
    `    <bpmn:endEvent id="${processId}_end" />`,
    ...flows,
    "  </bpmn:process>",
    "</bpmn:definitions>",
    "",
  ].join("\n");
}

type Lines = Array<{ from: SystemId; to: SystemId; text: string; reply?: boolean }>;

function sequenceLines(attempts: Attempt[], steps: ViewStep[]): Lines {
  const stepOf = new Map(steps.map((step) => [step.id, step]));
  const lines: Lines = [];
  for (const attempt of attempts) {
    const step = stepOf.get(attempt.nodeId);
    if (!step || attempt.result.kind === "disabled" || attempt.result.kind === "notRun" || step.system === "engine") continue;
    if (step.system === "source") {
      lines.push({ from: "source", to: "engine", text: step.name });
      continue;
    }
    lines.push({ from: "engine", to: step.system, text: step.name });
    const reply = attempt.result.kind === "failed" ? String(attempt.result.code) : "ok";
    lines.push({ from: step.system, to: "engine", text: reply, reply: true });
  }
  return lines;
}

/** Mermaid sequenceDiagram text of a recorded run. */
export function toMermaidSequence(attempts: Attempt[], steps: ViewStep[], systems: Array<{ id: SystemId; name: string }>): string {
  const alias = (id: SystemId) => id;
  return [
    "sequenceDiagram",
    ...systems.map((system) => `  participant ${alias(system.id)} as ${system.name}`),
    ...sequenceLines(attempts, steps).map((line) => `  ${alias(line.from)}${line.reply ? "-->>" : "->>"}${alias(line.to)}: ${line.text}`),
    "",
  ].join("\n");
}

/** PlantUML sequence text of a recorded run. */
export function toPlantUmlSequence(attempts: Attempt[], steps: ViewStep[], systems: Array<{ id: SystemId; name: string }>): string {
  return [
    "@startuml",
    ...systems.map((system) => `participant "${system.name}" as ${system.id}`),
    ...sequenceLines(attempts, steps).map((line) => `${line.from} ${line.reply ? "-->" : "->"} ${line.to}: ${line.text}`),
    "@enduml",
    "",
  ].join("\n");
}

/** Save text as a file in the browser. */
export function downloadText(filename: string, text: string, type: string): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type }));
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
