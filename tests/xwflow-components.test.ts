// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { layerPlaces, projectLayerStackView } from "../src/components/layer-stack/XWFlowLayerStack.view";
import { branchRows, columns, connector, extent, layout } from "../src/components/notation-diagram/XWFlowNotationDiagram.layout";
import type { XWFlowNotationEdge, XWFlowNotationStep } from "../src/components/notation-diagram/XWFlowNotationDiagram.types";
import { projectNotationDiagramView } from "../src/components/notation-diagram/XWFlowNotationDiagram.view";
import { h, renderInto, type XWUIViewChild, type XWUIViewNode } from "../src/components/view";

/** Every node in a view tree, depth first. */
function nodes(root: XWUIViewNode): XWUIViewNode[] {
  const out: XWUIViewNode[] = [root];
  for (const child of root.children ?? []) if (child && typeof child === "object") out.push(...nodes(child));
  return out;
}

const texts = (root: XWUIViewNode): string[] =>
  nodes(root).flatMap((node) => (node.children ?? []).filter((child: XWUIViewChild): child is string => typeof child === "string"));

const steps: XWFlowNotationStep[] = [
  { id: "start", name: "Start", shape: "terminal", hue: "lime" },
  { id: "order", name: "New order", shape: "io", hue: "lime" },
  { id: "lookup", name: "Look up customer", shape: "call", hue: "cyan" },
  { id: "over", name: "Over 500?", shape: "decision", hue: "orange" },
  { id: "notify", name: "Notify sales", shape: "process", hue: "pink" },
  { id: "log", name: "Log order", shape: "store", hue: "violet" },
];
const edges: XWFlowNotationEdge[] = [
  { from: "start", to: "order" },
  { from: "order", to: "lookup" },
  { from: "lookup", to: "lookup", label: "retry" },
  { from: "lookup", to: "over" },
  { from: "over", to: "notify", label: "yes", tone: "yes" },
  { from: "over", to: "log", label: "no", tone: "no" },
];

describe("XWFlowNotationDiagram layout", () => {
  it("places each step one column after the step before it, ignoring a retry loop", () => {
    const column = columns(steps, edges);
    expect(["start", "order", "lookup", "over", "notify", "log"].map((id) => column.get(id))).toEqual([0, 1, 2, 3, 4, 4]);
  });

  it("fans a decision's branches above and below its row", () => {
    const row = branchRows(steps, edges);
    expect([row.get("over"), row.get("notify"), row.get("log")]).toEqual([0, -1, 1]);
  });

  it("honours a fixed column and row, and draws straight or elbow connectors", () => {
    const boxes = layout([...steps.slice(0, 2), { ...steps[2], col: 5, row: 2 }], edges, () => 0);
    expect(boxes[2]).toMatchObject({ x: 120 + 5 * 190, y: 60 + 2 * 150 });
    expect(connector(boxes[0], boxes[1])).toMatch(/^M\d+ \d+ L\d+ \d+$/);
    expect(connector(boxes[1], boxes[2]).split("L")).toHaveLength(4);
    const size = extent(boxes);
    expect(size.width).toBeGreaterThan(boxes[2].x + boxes[2].w);
  });
});

describe("XWFlowNotationDiagram view", () => {
  it("draws every flowchart step and every edge label, with the retry loop", () => {
    const view = projectNotationDiagramView({ data: { title: "Order alert", steps, edges }, config: { mode: "flowchart" } });
    expect(view.classNames).toContain("xwflow-notation-diagram--flowchart");
    expect(nodes(view.node).some((node) => node.tag === "svg")).toBe(true);
    const words = texts(view.node);
    for (const step of steps) expect(words).toContain(step.name);
    expect(words).toEqual(expect.arrayContaining(["retry", "yes", "no"]));
  });

  it("draws the simulation's blocks with their figures and queue", () => {
    const view = projectNotationDiagramView({
      data: {
        title: "Sample model",
        labels: { queue: "queue" },
        steps: [
          { id: "arrive", name: "Orders arrive", subtitle: "Create", shape: "create", hue: "lime", stat: "281" },
          { id: "lookup", name: "Look up customer", subtitle: "Process, 4 workers", shape: "process", hue: "cyan", stat: "267 out, 14 waiting", queue: 14 },
          { id: "done", name: "Done", subtitle: "Dispose", shape: "dispose", hue: "violet", stat: "263" },
        ],
        edges: [{ from: "arrive", to: "lookup" }, { from: "lookup", to: "done" }],
      },
      config: { mode: "simulation" },
    });
    const words = texts(view.node);
    expect(words).toEqual(expect.arrayContaining(["Orders arrive", "Create", "281", "267 out, 14 waiting", "queue"]));
    // Fourteen waiting are drawn as at most five dots.
    expect(nodes(view.node).filter((node) => node.tag === "circle").length).toBeLessThanOrEqual(5);
  });
});

describe("XWFlowLayerStack view", () => {
  it("raises each layer by the spacing and labels it on its side", () => {
    expect(layerPlaces(3, 150).map((place) => place.z)).toEqual([0, 150, 300]);
    const refs: number[] = [];
    const view = projectLayerStackView(
      { data: { label: "Notations", layers: [{ label: "Flowchart", hue: "cyan" }, { label: "BPMN 2.0", hue: "orange" }, { label: "Node graph", hue: "lime" }] }, config: {} },
      { panelRef: (index) => (refs.push(index), () => undefined) },
    );
    expect(view.classNames[0]).toBe("xwflow-layer-stack");
    expect(texts(view.node)).toEqual(expect.arrayContaining(["Flowchart", "BPMN 2.0", "Node graph"]));
    expect(refs).toEqual([0, 1, 2]);
  });
});

describe("XWFlow view renderer", () => {
  it("draws HTML and SVG nodes with classes, attributes, styles and events, then hands refs their element", () => {
    const host = document.createElement("div");
    let clicked = 0;
    let refElement: HTMLElement | null = null;
    renderInto(
      host,
      h("div", { class: ["box", false, "box"], attrs: { "data-id": "a", hidden: false, role: "group" }, style: { "--depth": "3px", zIndex: "2" }, ref: (element) => (refElement = element) },
        h("button", { events: { click: () => (clicked += 1) } }, "Go"),
        h("svg", { attrs: { viewBox: "0 0 10 10" } }, h("path", { attrs: { d: "M0 0 L10 10" } })),
      ),
    );
    const box = host.firstElementChild as HTMLElement;
    expect(box.className).toBe("box");
    expect(box.getAttribute("role")).toBe("group");
    expect(box.hasAttribute("hidden")).toBe(false);
    expect(box.style.getPropertyValue("--depth")).toBe("3px");
    expect(box.style.zIndex).toBe("2");
    expect(refElement).toBe(box);
    host.querySelector("button")!.click();
    expect(clicked).toBe(1);
    expect(host.querySelector("path")!.namespaceURI).toBe("http://www.w3.org/2000/svg");
    renderInto(host, h("span", {}, "again"));
    expect(host.innerHTML).toBe("<span>again</span>");
  });
});
