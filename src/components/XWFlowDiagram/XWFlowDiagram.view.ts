import { svg } from "../../app/dom";
import type { Attempt, StepGroup, SystemId, ViewStep } from "../../types/domain";
import { branchRows, connector, extent, layout, LANE } from "./XWFlowDiagram.logic";
import type { Box, XWFlowDiagramConfig, XWFlowDiagramData } from "./XWFlowDiagram.types";

const color: Record<StepGroup, string> = {
  trigger: "var(--xwflow-lime)",
  control: "var(--xwflow-orange)",
  data: "var(--xwflow-violet)",
  ai: "var(--xwflow-pink)",
  integration: "var(--xwflow-cyan)",
};
const systemColor: Record<SystemId, string> = {
  source: "var(--xwflow-cyan)",
  engine: "var(--xwflow-violet)",
  api: "var(--xwflow-orange)",
  chat: "var(--xwflow-pink)",
  table: "var(--xwflow-lime)",
};
const ink = "#f5f5fa";
const muted = "#a9a9c2";
const panel = "rgba(20,20,36,.96)";

type Root = SVGSVGElement;

function text(root: Root, x: number, y: number, value: string, attrs: Record<string, string | number> = {}): SVGTextElement {
  const node = svg("text", { x, y, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: ink, "font-family": "Manrope, sans-serif", ...attrs });
  node.textContent = value;
  root.append(node);
  return node;
}

function line(root: Root, d: string, stroke = "rgba(255,255,255,.55)", extra: Record<string, string | number> = {}): void {
  root.append(svg("path", { d, stroke, "stroke-width": 1.8, fill: "none", "marker-end": "url(#xwflow-diagram-arrow)", ...extra }));
}

function defs(root: Root): void {
  const defsNode = svg("defs");
  const marker = svg("marker", { id: "xwflow-diagram-arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
  marker.append(svg("path", { d: "M0 0 L10 5 L0 10 z", fill: "rgba(255,255,255,.75)" }));
  defsNode.append(marker);
  root.append(defsNode);
}

function byId(boxes: Box[]): Map<string, Box> {
  return new Map(boxes.map((box) => [box.id, box]));
}

function edgesAndLabels(root: Root, data: XWFlowDiagramData, boxes: Map<string, Box>): void {
  for (const edge of data.edges) {
    const from = boxes.get(edge.from);
    const to = boxes.get(edge.to);
    if (!from || !to) continue;
    line(root, connector(from, to), edge.style === "idle" ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.65)", edge.style === "idle" ? { "stroke-dasharray": "6 6" } : {});
    if (edge.label) {
      const label = edge.label === "yes" ? data.labels.yes : edge.label === "no" ? data.labels.no : edge.label;
      text(root, from.x + from.w + 22, to.y + to.h / 2 - 8, label, { "font-size": 12, fill: edge.label === "yes" ? "#c8ff3d" : muted });
    }
  }
}

/* ---------------------------------------------------------------- flowchart (ISO 5807) */
function flowchart(root: Root, data: XWFlowDiagramData): { width: number; height: number } {
  const rows = branchRows(data.steps, data.edges);
  const boxes = layout(data.steps, data.edges, (step) => (rows.get(step.id) ?? 0) + 1, { x: 80, y: 40 });
  const map = byId(boxes);
  edgesAndLabels(root, data, map);
  for (const step of data.steps) {
    const box = map.get(step.id);
    if (!box) continue;
    const stroke = color[step.group];
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    if (step.group === "trigger") {
      root.append(svg("rect", { x: box.x, y: box.y + 8, width: box.w, height: box.h - 16, rx: (box.h - 16) / 2, fill: panel, stroke, "stroke-width": 2 }));
    } else if (step.type === "condition" || step.outputs > 1) {
      root.append(svg("polygon", { points: `${cx},${box.y - 10} ${box.x + box.w},${cy} ${cx},${box.y + box.h + 10} ${box.x},${cy}`, fill: panel, stroke, "stroke-width": 2 }));
    } else if (step.type === "http") {
      root.append(svg("rect", { x: box.x, y: box.y, width: box.w, height: box.h, fill: panel, stroke, "stroke-width": 2 }));
      root.append(svg("path", { d: `M${box.x + 12} ${box.y} L${box.x + 12} ${box.y + box.h} M${box.x + box.w - 12} ${box.y} L${box.x + box.w - 12} ${box.y + box.h}`, stroke, "stroke-width": 1.5 }));
    } else if (step.type === "message" || step.type === "needsConnection") {
      root.append(svg("polygon", { points: `${box.x + 18},${box.y} ${box.x + box.w},${box.y} ${box.x + box.w - 18},${box.y + box.h} ${box.x},${box.y + box.h}`, fill: panel, stroke, "stroke-width": 2 }));
    } else if (step.type === "appendRow") {
      root.append(
        svg("path", {
          d: `M${box.x} ${box.y} L${box.x + box.w} ${box.y} L${box.x + box.w} ${box.y + box.h - 8} Q ${box.x + box.w * 0.75} ${box.y + box.h - 20}, ${cx} ${box.y + box.h - 6} T ${box.x} ${box.y + box.h - 4} Z`,
          fill: panel,
          stroke,
          "stroke-width": 2,
        }),
      );
    } else {
      root.append(svg("rect", { x: box.x, y: box.y, width: box.w, height: box.h, rx: 4, fill: panel, stroke, "stroke-width": 2 }));
    }
    text(root, cx, cy + 5, step.name, { opacity: step.state === "disabled" ? 0.5 : 1 });
  }
  return extent(boxes);
}

/* ---------------------------------------------------------------- swimlanes */
function laneIndex(data: XWFlowDiagramData, config: XWFlowDiagramConfig): (step: ViewStep) => number {
  if (config.laneBy === "group") {
    const groups = [...new Set(data.steps.map((step) => step.group))];
    return (step) => groups.indexOf(step.group);
  }
  return (step) => Math.max(0, data.systems.findIndex((system) => system.id === step.system));
}

function laneNames(data: XWFlowDiagramData, config: XWFlowDiagramConfig): Array<{ name: string; tint: string }> {
  if (config.laneBy === "group") return [...new Set(data.steps.map((step) => step.group))].map((group) => ({ name: group, tint: color[group] }));
  return data.systems.map((system) => ({ name: system.name, tint: systemColor[system.id] }));
}

function swimlane(root: Root, data: XWFlowDiagramData, config: XWFlowDiagramConfig): { width: number; height: number } {
  const lanes = laneNames(data, config);
  const boxes = layout(data.steps, data.edges, laneIndex(data, config), { x: 200, y: 43 });
  const size = extent(boxes);
  const width = Math.max(size.width, 900);
  lanes.forEach((lane, index) => {
    const y = 10 + index * LANE;
    root.append(svg("rect", { x: 10, y, width: width - 20, height: LANE - 6, rx: 12, fill: index % 2 ? "rgba(255,255,255,.02)" : "rgba(255,255,255,.045)", stroke: "rgba(255,255,255,.1)" }));
    root.append(svg("rect", { x: 10, y, width: 6, height: LANE - 6, rx: 3, fill: lane.tint }));
    text(root, 30, y + LANE / 2, lane.name.toUpperCase(), { "text-anchor": "start", fill: lane.tint, "font-size": 12, "letter-spacing": "0.12em" });
  });
  const map = byId(boxes);
  edgesAndLabels(root, data, map);
  for (const step of data.steps) {
    const box = map.get(step.id);
    if (!box) continue;
    root.append(svg("rect", { x: box.x, y: box.y, width: box.w, height: box.h, rx: 12, fill: panel, stroke: color[step.group], "stroke-width": 2, opacity: step.state === "disabled" ? 0.5 : 1 }));
    root.append(svg("rect", { x: box.x + 12, y: box.y - 1, width: box.w - 24, height: 2, fill: color[step.group] }));
    text(root, box.x + box.w / 2, box.y + box.h / 2 + 5, step.name);
  }
  return { width, height: Math.max(size.height, lanes.length * LANE + 20) };
}

/* ---------------------------------------------------------------- BPMN 2.0 */
function bpmn(root: Root, data: XWFlowDiagramData): { width: number; height: number } {
  const source = data.systems.find((system) => system.id === "source");
  const humanLane = (step: ViewStep): number => (step.system === "chat" ? 1 : 0);
  const boxes = layout(data.steps, data.edges, humanLane, { x: 120, y: 190 });
  const size = extent(boxes, 80);
  const width = Math.max(size.width + 80, 1000);
  const poolTop = 130;
  const poolHeight = 2 * LANE + 20;
  root.append(svg("rect", { x: 80, y: 20, width: width - 120, height: 60, rx: 4, fill: "rgba(255,255,255,.03)", stroke: "rgba(255,255,255,.3)" }));
  text(root, width / 2, 56, source?.name ?? "", { "font-size": 14 });
  text(root, width - 60, 56, data.labels.blackBox, { "text-anchor": "end", "font-size": 11, fill: muted });
  root.append(svg("rect", { x: 20, y: poolTop, width: width - 60, height: poolHeight, rx: 4, fill: "rgba(255,255,255,.02)", stroke: "rgba(255,255,255,.3)" }));
  root.append(svg("path", { d: `M60 ${poolTop} L60 ${poolTop + poolHeight} M60 ${poolTop + LANE + 10} L${width - 40} ${poolTop + LANE + 10}`, stroke: "rgba(255,255,255,.2)" }));
  const titleNode = text(root, 40, poolTop + poolHeight / 2, data.labels.title, { "font-size": 12 });
  titleNode.setAttribute("transform", `rotate(-90 40 ${poolTop + poolHeight / 2})`);
  const lanes = [data.labels.automation, data.systems.find((system) => system.id === "chat")?.name ?? ""];
  lanes.forEach((lane, index) => {
    const y = poolTop + 10 + index * LANE + LANE / 2;
    const node = text(root, 74, y, lane, { "font-size": 11, fill: index ? "#ff8cc5" : "#c4adff" });
    node.setAttribute("transform", `rotate(-90 74 ${y})`);
  });
  const map = byId(boxes);
  for (const edge of data.edges) {
    const from = map.get(edge.from);
    const to = map.get(edge.to);
    if (!from || !to) continue;
    line(root, connector(from, to), "rgba(255,255,255,.65)", edge.style === "idle" ? { "stroke-dasharray": "6 6" } : {});
    if (edge.label) text(root, from.x + from.w + 24, to.y + to.h / 2 - 8, edge.label === "yes" ? data.labels.yes : data.labels.no, { "font-size": 12, fill: edge.label === "yes" ? "#c8ff3d" : muted });
  }
  const first = data.steps[0];
  if (first && map.get(first.id)) {
    const box = map.get(first.id) as Box;
    line(root, `M${box.x + box.w / 2} 80 L${box.x + box.w / 2} ${box.y - 4}`, "rgba(255,255,255,.4)", { "stroke-dasharray": "5 5" });
  }
  data.steps.forEach((step, index) => {
    const box = map.get(step.id);
    if (!box) return;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    if (step.group === "trigger") {
      root.append(svg("circle", { cx, cy, r: 20, fill: panel, stroke: color.trigger, "stroke-width": 2.5 }));
      root.append(svg("rect", { x: cx - 9, y: cy - 6, width: 18, height: 12, rx: 2, fill: "none", stroke: color.trigger, "stroke-width": 1.5 }));
      text(root, cx, cy + 40, step.name, { "font-size": 12 });
    } else if (step.type === "condition" || step.outputs > 1) {
      root.append(svg("polygon", { points: `${cx},${cy - 26} ${cx + 26},${cy} ${cx},${cy + 26} ${cx - 26},${cy}`, fill: panel, stroke: color.control, "stroke-width": 2.5 }));
      text(root, cx, cy + 6, "×", { "font-size": 22, fill: "#ffb07f" });
      text(root, cx, cy - 36, step.name, { "font-size": 12 });
    } else {
      root.append(svg("rect", { x: box.x, y: box.y, width: box.w, height: box.h, rx: 14, fill: panel, stroke: color[step.group], "stroke-width": 2, opacity: step.state === "disabled" ? 0.55 : 1 }));
      text(root, cx, cy + 5, step.name);
      if (step.type === "http") {
        root.append(svg("circle", { cx: box.x + box.w - 18, cy: box.y + box.h, r: 11, fill: panel, stroke: "var(--xwflow-red)", "stroke-width": 2 }));
        text(root, box.x + box.w - 18, box.y + box.h + 4, "ϟ", { "font-size": 11, fill: "#ff8e9a" });
        line(root, `M${box.x + box.w - 18} ${box.y + box.h + 11} L${box.x + box.w - 18} ${box.y + box.h + 50} L${box.x + box.w + 22} ${box.y + box.h + 50}`, "rgba(255,92,108,.8)");
        text(root, box.x + box.w + 30, box.y + box.h + 54, data.labels.notFound, { "text-anchor": "start", "font-size": 12, fill: "#ff8e9a" });
      }
      if (step.type === "appendRow") {
        const dx = cx;
        const dy = box.y + box.h + 40;
        root.append(svg("path", { d: `M${dx - 18} ${dy} Q ${dx} ${dy - 8}, ${dx + 18} ${dy} L${dx + 18} ${dy + 26} Q ${dx} ${dy + 34}, ${dx - 18} ${dy + 26} Z`, fill: "rgba(200,255,61,.08)", stroke: color.trigger, "stroke-width": 1.5 }));
        line(root, `M${dx} ${box.y + box.h} L${dx} ${dy - 6}`, "rgba(255,255,255,.4)", { "stroke-dasharray": "4 4" });
        text(root, dx, dy + 50, data.systems.find((system) => system.id === "table")?.name ?? "", { "font-size": 11, fill: muted });
      }
    }
    if (index === data.steps.length - 1) {
      const endX = box.x + box.w + 70;
      root.append(svg("circle", { cx: endX, cy, r: 18, fill: panel, stroke: ink, "stroke-width": 4 }));
      line(root, `M${box.x + box.w} ${cy} L${endX - 22} ${cy}`);
    }
  });
  return { width, height: Math.max(size.height + 60, poolTop + poolHeight + 20) };
}

/* ---------------------------------------------------------------- UML sequence, drawn from a receipt */
function sequence(root: Root, data: XWFlowDiagramData, onAttempt: (id: string) => void): { width: number; height: number } {
  const systems = data.systems;
  const lifeline = new Map(systems.map((system, index) => [system.id, 220 + index * 200]));
  const stepOf = new Map(data.steps.map((step) => [step.id, step]));
  const top = 30;
  const rows: Array<{ attempt: Attempt; y: number }> = [];
  let y = top + 90;
  const height = 140 + data.attempts.reduce((sum, attempt) => sum + (attempt.result.kind === "failed" ? 110 : 78), 0);
  systems.forEach((system) => {
    const x = lifeline.get(system.id) ?? 0;
    root.append(svg("rect", { x: x - 70, y: top, width: 140, height: 40, rx: 8, fill: systemColor[system.id], opacity: 0.95 }));
    text(root, x, top + 26, system.name, { fill: "#0a0a0a", "font-size": 13 });
    root.append(svg("path", { d: `M${x} ${top + 40} L${x} ${height}`, stroke: "rgba(255,255,255,.25)", "stroke-dasharray": "4 6" }));
  });
  const engine = lifeline.get("engine") ?? 0;
  root.append(svg("rect", { x: engine - 6, y: top + 70, width: 12, height: height - top - 90, rx: 3, fill: "var(--xwflow-violet)", opacity: 0.85 }));

  for (const attempt of data.attempts) {
    const step = stepOf.get(attempt.nodeId);
    if (!step) continue;
    rows.push({ attempt, y });
    const kind = attempt.result.kind;
    const target = lifeline.get(step.system) ?? engine;
    if (step.system === "source") {
      line(root, `M${lifeline.get("source")} ${y} L${engine - 8} ${y}`);
      text(root, (engine + (lifeline.get("source") ?? 0)) / 2, y - 8, step.name, { "font-size": 12 });
    } else if (kind === "disabled" || kind === "notRun") {
      const target = lifeline.get(step.system) ?? engine;
      line(root, `M${engine + 8} ${y} L${target - 8} ${y}`, "rgba(255,255,255,.25)", { "stroke-dasharray": "3 6" });
      text(root, (engine + target) / 2, y - 8, `${step.name}: ${kind === "disabled" ? data.labels.skipped : data.labels.notRun}`, { "font-size": 12, fill: muted });
    } else if (step.system === "engine") {
      if (step.outputs > 1) {
        root.append(svg("rect", { x: engine - 40, y: y - 26, width: Math.max(...lifeline.values()) - engine + 100, height: 52, rx: 6, fill: "rgba(200,255,61,.04)", stroke: "rgba(200,255,61,.5)" }));
        text(root, engine - 30, y - 12, data.labels.alt, { "text-anchor": "start", "font-size": 11, fill: "#c8ff3d" });
        const branch = kind === "branch" ? ` → ${attempt.result.branch}` : "";
        text(root, engine + 14, y + 6, `[${step.name}]${branch}`, { "text-anchor": "start", "font-size": 12, fill: "#c8ff3d" });
      } else {
        text(root, engine + 20, y + 4, `${step.name}: ${data.labels.noMessage}`, { "text-anchor": "start", "font-size": 12, fill: muted });
      }
    } else {
      const failed = kind === "failed";
      line(root, `M${engine + 8} ${y - 10} L${target - 8} ${y - 10}`);
      text(root, (engine + target) / 2, y - 16, step.name, { "font-size": 12 });
      root.append(svg("rect", { x: target - 6, y: y - 14, width: 12, height: 28, rx: 3, fill: systemColor[step.system] }));
      line(root, `M${target - 8} ${y + 12} L${engine + 8} ${y + 12}`, failed ? "var(--xwflow-red)" : "var(--xwflow-green)", { "stroke-dasharray": "6 5" });
      const reply = failed && kind === "failed" ? `${attempt.result.code}` : kind === "branch" ? attempt.result.branch : data.labels.accepted;
      text(root, (engine + target) / 2, y + 28, reply, { "font-size": 12, fill: failed ? "#ff8e9a" : "#3dffa2" });
      if (failed) {
        root.append(svg("path", { d: `M${engine + 8} ${y + 40} L${engine + 46} ${y + 40} L${engine + 46} ${y + 58} L${engine + 10} ${y + 58}`, stroke: "var(--xwflow-amber)", "stroke-width": 1.6, fill: "none", "marker-end": "url(#xwflow-diagram-arrow)" }));
        text(root, engine + 54, y + 54, data.labels.retryWait, { "text-anchor": "start", "font-size": 11, fill: "#ffd77a" });
      }
    }
    y += kind === "failed" ? 110 : 78;
  }

  rows.forEach(({ attempt, y: rowY }, index) => {
    const group = stepOf.get(attempt.nodeId)?.group ?? "data";
    const dot = svg("g", { class: "xwflow-diagram__dot", tabindex: 0, role: "button", "aria-label": `${index + 1}. ${attempt.step}` });
    const selected = data.selectedAttempt === attempt.id;
    dot.append(svg("circle", { cx: 60, cy: rowY, r: selected ? 15 : 12, fill: attempt.result.kind === "failed" ? "var(--xwflow-red)" : color[group], stroke: selected ? "#fff" : "none", "stroke-width": 2 }));
    const label = svg("text", { x: 60, y: rowY + 4, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#0a0a0a", "font-family": "Manrope, sans-serif" });
    label.textContent = String(index + 1);
    dot.append(label);
    dot.addEventListener("click", () => onAttempt(attempt.id));
    dot.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Enter" || (event as KeyboardEvent).key === " ") onAttempt(attempt.id);
    });
    root.append(dot);
  });
  return { width: 220 + systems.length * 200, height };
}

export function renderDiagram(container: HTMLElement, data: XWFlowDiagramData, config: XWFlowDiagramConfig, onAttempt: (id: string) => void): void {
  container.className = ["xwflow-diagram", config.className].filter(Boolean).join(" ");
  container.dataset.mode = data.mode;
  const root = svg("svg", { role: "img", "aria-label": data.labels.title, preserveAspectRatio: "xMidYMin meet" });
  defs(root);
  const size =
    data.mode === "flowchart"
      ? flowchart(root, data)
      : data.mode === "swimlane"
        ? swimlane(root, data, config)
        : data.mode === "bpmn"
          ? bpmn(root, data)
          : sequence(root, data, onAttempt);
  root.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
  root.setAttribute("width", String(size.width));
  root.setAttribute("height", String(size.height));
  container.replaceChildren(root);
}
