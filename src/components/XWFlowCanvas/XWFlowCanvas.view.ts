import { el, svg } from "../../app/dom";
import type { StepGroup } from "../../types/domain";
import { connectedPins, inputPin, minimapBoxes, nodeHeight, outputPins, wireGeometry } from "./XWFlowCanvas.logic";
import type { XWFlowCanvasConfig, XWFlowCanvasData } from "./XWFlowCanvas.types";

const groupColor: Record<StepGroup, string> = {
  trigger: "var(--xwflow-lime)",
  control: "var(--xwflow-orange)",
  data: "var(--xwflow-violet)",
  ai: "var(--xwflow-pink)",
  integration: "var(--xwflow-cyan)",
};

export interface CanvasSlots {
  viewport: HTMLElement;
  stage: HTMLElement;
  nodes: Map<string, { card: HTMLElement; icon: HTMLElement; status: HTMLElement | null }>;
  tools: HTMLElement | null;
  minimap: HTMLElement | null;
}

export function renderCanvas(container: HTMLElement, data: XWFlowCanvasData, config: XWFlowCanvasConfig, nodeWidth: number): CanvasSlots {
  container.className = ["xwflow-canvas", config.className].filter(Boolean).join(" ");
  container.toggleAttribute("data-readonly", Boolean(config.readOnly));
  if (config.height) container.style.height = `${config.height}px`;

  const viewport = el("div", "xwflow-canvas__viewport");
  viewport.setAttribute("role", "group");
  viewport.setAttribute("aria-label", data.labels.canvas);
  const stage = el("div", "xwflow-canvas__stage");
  viewport.append(stage);

  const { graph } = data;
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));

  for (const frame of graph.frames) {
    const box = el("div", "xwflow-canvas__frame");
    Object.assign(box.style, { left: `${frame.x}px`, top: `${frame.y}px`, width: `${frame.width}px`, height: `${frame.height}px` });
    box.append(el("span", "xwflow-canvas__frame-label", frame.label));
    stage.append(box);
  }
  for (const note of graph.notes) {
    const box = el("div", "xwflow-canvas__note", note.text);
    Object.assign(box.style, { left: `${note.x}px`, top: `${note.y}px`, width: `${note.width}px` });
    stage.append(box);
  }

  const wires = svg("svg", { class: "xwflow-canvas__wires", "aria-hidden": "true", fill: "none", "stroke-linecap": "round" });
  const defs = svg("defs");
  wires.append(defs);
  const geometry = wireGeometry(graph, nodeWidth);
  graph.edges.forEach((edge, index) => {
    const wire = geometry[index];
    if (!wire) return;
    const source = byId.get(edge.from);
    const target = byId.get(edge.to);
    if (!source || !target) return;
    if (edge.style === "idle") {
      wires.append(svg("path", { d: wire.path, class: "xwflow-canvas__wire", "data-idle": "", "stroke-width": 2.5 }));
    } else {
      const gradientId = `xwflow-wire-${container.dataset.uid ?? "c"}-${index}`;
      const gradient = svg("linearGradient", {
        id: gradientId,
        gradientUnits: "userSpaceOnUse",
        x1: wire.from.x,
        y1: wire.from.y,
        x2: wire.to.x,
        y2: wire.to.y,
      });
      gradient.append(
        svg("stop", { offset: 0, style: `stop-color:${groupColor[source.group]}` }),
        svg("stop", { offset: 1, style: `stop-color:${groupColor[target.group]}` }),
      );
      defs.append(gradient);
      wires.append(svg("path", { d: wire.path, class: "xwflow-canvas__wire", stroke: `url(#${gradientId})`, "stroke-width": 3.5 }));
      if (target.state !== "disabled") wires.append(svg("path", { d: wire.path, class: "xwflow-canvas__flow", "stroke-width": 1.5 }));
    }
    if (wire.label) {
      const label = el("span", "xwflow-canvas__wire-label", wire.label.text);
      label.dataset.idle = edge.style === "idle" ? "true" : "false";
      label.dataset.group = source.group;
      Object.assign(label.style, { left: `${wire.label.x}px`, top: `${wire.label.y}px` });
      stage.append(label);
    }
  });
  stage.prepend(wires);

  const pins = connectedPins(graph);
  const nodes: CanvasSlots["nodes"] = new Map();
  for (const node of graph.nodes) {
    const view = data.views[node.id];
    const card = el("button", "xwflow-canvas__node");
    card.type = "button";
    card.dataset.id = node.id;
    card.dataset.group = node.group;
    card.dataset.state = node.state;
    if (view?.failed) card.dataset.failed = "";
    if (node.id === data.selectedId) card.setAttribute("aria-pressed", "true");
    else card.setAttribute("aria-pressed", "false");
    card.setAttribute("aria-label", `${node.name}, ${view?.typeLabel ?? node.type}${view?.status ? `, ${view.status.label}` : ""}`);
    Object.assign(card.style, { left: `${node.x}px`, top: `${node.y}px`, width: `${nodeWidth}px`, minHeight: `${nodeHeight(node)}px` });

    const head = el("span", "xwflow-canvas__node-head");
    const icon = el("span");
    const text = el("span", "xwflow-canvas__node-text");
    const type = el("span", "xwflow-canvas__node-type", view?.typeLabel ?? node.type);
    if (view?.warn) type.dataset.warn = "";
    text.append(el("span", "xwflow-canvas__node-name", node.name), type);
    head.append(icon, text);
    card.append(head);
    let status: HTMLElement | null = null;
    if (view?.status) {
      status = el("span", "xwflow-canvas__node-status");
      card.append(status);
    }

    const hasIncoming = graph.edges.some((edge) => edge.to === node.id) || node.group !== "trigger";
    if (hasIncoming) {
      const pin = el("span", "xwflow-canvas__pin");
      pin.dataset.side = "in";
      pin.style.top = `${inputPin(node)}px`;
      if (pins.inputs.has(node.id)) pin.dataset.on = "";
      card.append(pin);
    }
    outputPins(node).slice(0, node.outputs).forEach((offset, port) => {
      const pin = el("span", "xwflow-canvas__pin");
      pin.dataset.side = "out";
      pin.style.top = `${offset}px`;
      if (pins.outputs.has(`${node.id}:${port}`)) pin.dataset.on = "";
      card.append(pin);
    });
    stage.append(card);
    nodes.set(node.id, { card, icon, status });
  }

  let tools: HTMLElement | null = null;
  if (config.tools) {
    tools = el("div", "xwflow-canvas__tools");
    tools.setAttribute("role", "toolbar");
  }

  let minimap: HTMLElement | null = null;
  if (config.minimap) {
    minimap = el("div", "xwflow-canvas__minimap");
    minimap.setAttribute("role", "img");
    minimap.setAttribute("aria-label", data.labels.minimap);
    for (const box of minimapBoxes(graph, nodeWidth)) {
      const dot = el("i", "xwflow-canvas__minimap-node");
      dot.dataset.group = byId.get(box.id)?.group ?? "data";
      Object.assign(dot.style, { left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` });
      minimap.append(dot);
    }
  }

  container.replaceChildren(viewport, ...(tools ? [tools] : []), ...(minimap ? [minimap] : []));
  return { viewport, stage, nodes, tools, minimap };
}
