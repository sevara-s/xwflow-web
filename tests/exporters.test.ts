import { describe, expect, it } from "vitest";
import { toBpmnXml, toMermaidSequence, toPlantUmlSequence } from "../src/app/exporters";
import type { Attempt, CanvasEdge, ViewStep } from "../src/types/domain";

const steps: ViewStep[] = [
  { id: "a", name: "New order", type: "webhook", group: "trigger", state: "normal", outputs: 1, system: "source" },
  { id: "b", name: "Look up <customer>", type: "http", group: "integration", state: "normal", outputs: 1, system: "api" },
  { id: "c", name: "Over 500?", type: "condition", group: "control", state: "normal", outputs: 2, system: "engine" },
  { id: "d", name: "Notify sales", type: "message", group: "ai", state: "disabled", outputs: 0, system: "chat" },
];
const edges: CanvasEdge[] = [
  { from: "a", to: "b", style: "active" },
  { from: "b", to: "c", style: "active" },
  { from: "c", to: "d", label: "yes", style: "active" },
];
const attempt = (id: string, nodeId: string, result: Attempt["result"]): Attempt => ({
  id,
  nodeId,
  step: id,
  group: "integration",
  tryIndex: 1,
  tryCount: 1,
  result,
  payload: "stored",
  inCount: 1,
  outCount: 1,
  durationMs: 10,
  offsetMs: 0,
  io: { input: {}, output: {}, error: null },
});
const systems = [
  { id: "source" as const, name: "Shop" },
  { id: "engine" as const, name: "xwflow" },
  { id: "api" as const, name: "Customer API" },
  { id: "chat" as const, name: "Sales chat" },
];

describe("exporters", () => {
  it("writes BPMN with events, tasks, a gateway, escaped names and an end event", () => {
    const text = toBpmnXml("order_alert", "Order alert", steps, edges);
    expect(text).toContain('<bpmn:startEvent id="a" name="New order">');
    expect(text).toContain('<bpmn:serviceTask id="b" name="Look up &lt;customer&gt;" />');
    expect(text).toContain('<bpmn:exclusiveGateway id="c"');
    expect(text).toContain('sourceRef="c" targetRef="d" name="yes"');
    expect(text).toContain('<bpmn:endEvent id="order_alert_end" />');
    expect(text).toContain('sourceRef="d" targetRef="order_alert_end"');
  });

  it("writes Mermaid and PlantUML sequences from a receipt, skipping disabled steps", () => {
    const attempts = [
      attempt("1", "a", { kind: "pinned" }),
      attempt("2", "b", { kind: "failed", code: 503 }),
      attempt("3", "b", { kind: "succeeded" }),
      attempt("4", "c", { kind: "branch", branch: "yes" }),
      attempt("5", "d", { kind: "disabled" }),
    ];
    const mermaid = toMermaidSequence(attempts, steps, systems);
    expect(mermaid.split("\n")[0]).toBe("sequenceDiagram");
    expect(mermaid).toContain("participant api as Customer API");
    expect(mermaid).toContain("api-->>engine: 503");
    expect(mermaid).not.toContain("Notify sales");
    const plant = toPlantUmlSequence(attempts, steps, systems);
    expect(plant.startsWith("@startuml")).toBe(true);
    expect(plant).toContain("source -> engine: New order");
    expect(plant.trim().endsWith("@enduml")).toBe(true);
  });
});
