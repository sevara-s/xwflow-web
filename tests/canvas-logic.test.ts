import { describe, expect, it } from "vitest";
import {
  clampScale,
  fitTransform,
  graphBounds,
  minimapBoxes,
  outputPins,
  tidyLayout,
  wireGeometry,
  zoomAt,
} from "../src/components/XWFlowCanvas/XWFlowCanvas.logic";
import type { CanvasNode, FlowGraph } from "../src/types/domain";

const node = (id: string, x: number, y: number, extra: Partial<CanvasNode> = {}): CanvasNode => ({
  id,
  name: id,
  type: "http",
  group: "integration",
  x,
  y,
  state: "normal",
  outputs: 1,
  ...extra,
});

const graph: FlowGraph = {
  nodes: [node("a", 0, 0, { group: "trigger" }), node("b", 300, 0), node("c", 600, -80), node("d", 600, 80)],
  edges: [
    { from: "a", to: "b", style: "active" },
    { from: "b", to: "c", port: 0, label: "yes", style: "active" },
    { from: "b", to: "d", port: 1, label: "no", style: "idle" },
  ],
  notes: [],
  frames: [],
};

describe("canvas geometry", () => {
  it("measures the graph including node width and height", () => {
    expect(graphBounds(graph, 150)).toEqual({ minX: 0, minY: -80, maxX: 750, maxY: 152 });
  });

  it("spreads output pins down a branching node", () => {
    expect(outputPins(node("x", 0, 0, { outputs: 1 }))).toEqual([34]);
    const pins = outputPins(node("x", 0, 0, { outputs: 2, height: 100 }));
    expect(pins).toHaveLength(2);
    expect(pins[0]).toBeLessThan(pins[1]);
  });

  it("fits the graph into the free area and never enlarges past the cap", () => {
    const fit = fitTransform(graphBounds(graph, 150), 2000, 1000, { top: 0, right: 0, bottom: 0, left: 0 }, 1);
    expect(fit.scale).toBe(1);
    const tight = fitTransform(graphBounds(graph, 150), 400, 300, { top: 0, right: 0, bottom: 0, left: 0 }, 1);
    expect(tight.scale).toBeLessThan(1);
    expect(tight.scale).toBeGreaterThanOrEqual(0.35);
  });

  it("keeps the point under the cursor still while zooming", () => {
    const before = { x: 10, y: 20, scale: 1 };
    const after = zoomAt(before, 2, 110, 120);
    expect(after.scale).toBe(2);
    expect((110 - after.x) / after.scale).toBeCloseTo((110 - before.x) / before.scale);
  });

  it("clamps zoom to a usable range", () => {
    expect(clampScale(0.01)).toBe(0.35);
    expect(clampScale(9)).toBe(2);
  });

  it("draws straight wires on one row and curves between rows, with branch labels", () => {
    const wires = wireGeometry(graph, 150);
    expect(wires).toHaveLength(3);
    expect(wires[0].path.startsWith("M150 ")).toBe(true);
    expect(wires[0].path).toContain(" L");
    expect(wires[1].path).toContain(" C ");
    expect(wires[1].label?.text).toBe("yes");
  });

  it("tidies nodes into columns by distance from the trigger", () => {
    const positions = tidyLayout(graph, 150);
    const x = Object.fromEntries(positions.map((item) => [item.id, item.x]));
    expect(x.a).toBeLessThan(x.b);
    expect(x.c).toBe(x.d);
    const y = Object.fromEntries(positions.map((item) => [item.id, item.y]));
    expect(y.c).not.toBe(y.d);
  });

  it("projects nodes into the unit square for the minimap", () => {
    for (const box of minimapBoxes(graph, 150)) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(1.0001);
      expect(box.y).toBeGreaterThanOrEqual(0);
    }
  });
});
