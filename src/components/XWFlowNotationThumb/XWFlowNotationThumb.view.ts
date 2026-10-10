import { svg } from "../../app/dom";
import type { StepGroup } from "../../types/domain";
import { flowAsCode, shortName, thumbStyle } from "./XWFlowNotationThumb.logic";
import type { ThumbStep, XWFlowNotationThumbConfig, XWFlowNotationThumbData } from "./XWFlowNotationThumb.types";

const W = 360;
const H = 220;
const color: Record<StepGroup, string> = {
  trigger: "var(--xwflow-lime)",
  control: "var(--xwflow-orange)",
  data: "var(--xwflow-violet)",
  ai: "var(--xwflow-pink)",
  integration: "var(--xwflow-cyan)",
};
const line = "rgba(255,255,255,.35)";

type Svg = SVGSVGElement;

function text(root: Svg, x: number, y: number, value: string, options: { anchor?: string; size?: number; fill?: string; mono?: boolean } = {}): void {
  const node = svg("text", {
    x,
    y,
    "text-anchor": options.anchor ?? "middle",
    "font-size": options.size ?? 10,
    fill: options.fill ?? "#f5f5fa",
    "font-weight": 700,
    "font-family": options.mono ? "JetBrains Mono, monospace" : "Manrope, sans-serif",
  });
  node.textContent = value;
  root.append(node);
}

function arrow(root: Svg, d: string, stroke = line, dashed = false): void {
  root.append(svg("path", { d, stroke, "stroke-width": 1.6, fill: "none", "marker-end": "url(#xwflow-arrow)", ...(dashed ? { "stroke-dasharray": "4 4" } : {}) }));
}

function rect(root: Svg, x: number, y: number, w: number, h: number, stroke: string, radius = 8, fill = "rgba(20,20,36,.95)"): void {
  root.append(svg("rect", { x, y, width: w, height: h, rx: radius, fill, stroke, "stroke-width": 1.5 }));
}

function drawGraph(root: Svg, steps: ThumbStep[]): void {
  const main = steps.slice(0, 3);
  main.forEach((step, index) => {
    const x = 14 + index * 112;
    rect(root, x, 92, 96, 40, color[step.group], 10);
    root.append(svg("rect", { x: x + 10, y: 91, width: 76, height: 2, fill: color[step.group] }));
    text(root, x + 48, 116, shortName(step.name, 13));
    if (index) arrow(root, `M${x - 16} 112 L${x - 2} 112`, color[step.group]);
  });
  steps.slice(3, 5).forEach((step, index) => {
    const y = index ? 168 : 22;
    rect(root, 250, y, 96, 36, color[step.group], 10);
    text(root, 298, y + 22, shortName(step.name, 13));
    root.append(svg("path", { d: `M234 112 C 244 112, 240 ${y + 18}, 248 ${y + 18}`, stroke: color[step.group], "stroke-width": 1.6, fill: "none" }));
  });
}

function drawFlowchart(root: Svg, steps: ThumbStep[]): void {
  root.append(svg("rect", { x: 20, y: 18, width: 90, height: 28, rx: 14, fill: "none", stroke: "var(--xwflow-lime)", "stroke-width": 1.5 }));
  text(root, 65, 36, shortName(steps[0]?.name ?? "", 12));
  arrow(root, "M65 46 L65 64");
  rect(root, 20, 66, 90, 30, "var(--xwflow-cyan)", 3);
  text(root, 65, 85, shortName(steps[1]?.name ?? "", 12));
  arrow(root, "M65 96 L65 112");
  root.append(svg("polygon", { points: "65,114 105,140 65,166 25,140", fill: "rgba(20,20,36,.95)", stroke: "var(--xwflow-orange)", "stroke-width": 1.5 }));
  text(root, 65, 144, shortName(steps[2]?.name ?? "", 10), { size: 9 });
  arrow(root, "M105 140 L170 140", "var(--xwflow-orange)");
  text(root, 135, 134, "yes", { size: 9, fill: "#ffb07f" });
  rect(root, 172, 124, 90, 32, "var(--xwflow-pink)", 3);
  text(root, 217, 144, shortName(steps[3]?.name ?? "", 12));
  arrow(root, "M65 166 L65 190 L300 190 L300 160");
  text(root, 80, 184, "no", { size: 9, fill: "#6f6f8a" });
  root.append(svg("path", { d: "M272 124 L272 104 L330 104 L330 156 L272 156 Z", fill: "none", stroke: "var(--xwflow-violet)", "stroke-width": 1.5 }));
  text(root, 301, 134, shortName(steps[4]?.name ?? "", 8), { size: 9 });
}

function drawSwimlane(root: Svg, steps: ThumbStep[]): void {
  const lanes = ["Shop", "CRM", "Sales"];
  lanes.forEach((lane, index) => {
    const y = 10 + index * 68;
    root.append(svg("rect", { x: 8, y, width: W - 16, height: 64, rx: 8, fill: index % 2 ? "rgba(255,255,255,.02)" : "rgba(255,255,255,.045)", stroke: "rgba(255,255,255,.1)" }));
    text(root, 30, y + 36, lane, { size: 9, fill: "#a9a9c2" });
  });
  const place = [
    [64, 24],
    [140, 92],
    [210, 92],
    [270, 160],
    [270, 24],
  ];
  steps.slice(0, 5).forEach((step, index) => {
    const [x, y] = place[index];
    rect(root, x, y, 70, 34, color[step.group], 8);
    text(root, x + 35, y + 21, shortName(step.name, 10), { size: 9 });
  });
  arrow(root, "M134 41 L150 41 L150 90");
  arrow(root, "M210 109 L212 109");
  arrow(root, "M280 126 L300 158");
}

function drawBpmn(root: Svg, steps: ThumbStep[]): void {
  root.append(svg("rect", { x: 8, y: 30, width: W - 16, height: 160, rx: 6, fill: "rgba(255,255,255,.02)", stroke: "rgba(255,255,255,.18)" }));
  root.append(svg("circle", { cx: 34, cy: 110, r: 12, fill: "none", stroke: "var(--xwflow-lime)", "stroke-width": 2 }));
  arrow(root, "M46 110 L62 110");
  rect(root, 64, 92, 80, 36, "var(--xwflow-cyan)", 10);
  text(root, 104, 114, shortName(steps[1]?.name ?? "", 11), { size: 9 });
  arrow(root, "M144 110 L162 110");
  root.append(svg("polygon", { points: "180,92 198,110 180,128 162,110", fill: "rgba(20,20,36,.95)", stroke: "var(--xwflow-orange)", "stroke-width": 1.8 }));
  text(root, 180, 114, "×", { size: 12, fill: "#ffb07f" });
  arrow(root, "M180 92 L180 60 L222 60");
  rect(root, 224, 44, 80, 32, "var(--xwflow-pink)", 10);
  text(root, 264, 64, shortName(steps[3]?.name ?? "", 11), { size: 9 });
  arrow(root, "M180 128 L180 160 L222 160");
  rect(root, 224, 144, 80, 32, "var(--xwflow-violet)", 10);
  text(root, 264, 164, shortName(steps[4]?.name ?? "", 11), { size: 9 });
  root.append(svg("circle", { cx: 332, cy: 110, r: 11, fill: "none", stroke: "var(--xwflow-red)", "stroke-width": 3.5 }));
  arrow(root, "M304 60 L332 60 L332 96");
  arrow(root, "M304 160 L332 160 L332 124");
}

function drawSequence(root: Svg, steps: ThumbStep[]): void {
  const actors = ["Shop", "xwflow", "CRM", "Chat"];
  actors.forEach((actor, index) => {
    const x = 50 + index * 87;
    rect(root, x - 34, 10, 68, 24, index === 1 ? "var(--xwflow-lime)" : "rgba(255,255,255,.3)", 6);
    text(root, x, 26, actor, { size: 9 });
    root.append(svg("path", { d: `M${x} 34 L${x} 210`, stroke: "rgba(255,255,255,.22)", "stroke-dasharray": "3 4" }));
  });
  const calls: Array<[number, number, number, string, boolean]> = [
    [50, 137, 58, steps[0]?.name ?? "", false],
    [137, 224, 92, steps[1]?.name ?? "", false],
    [224, 137, 116, "503", true],
    [137, 224, 140, steps[1]?.name ?? "", false],
    [137, 311, 176, steps[3]?.name ?? "", false],
  ];
  for (const [from, to, y, label, back] of calls) {
    arrow(root, `M${from} ${y} L${to} ${y}`, back ? "var(--xwflow-red)" : line, back);
    text(root, (from + to) / 2, y - 5, shortName(label, 14), { size: 8, fill: back ? "#ff8e9a" : "#a9a9c2" });
  }
}

function drawStates(root: Svg, steps: ThumbStep[]): void {
  root.append(svg("circle", { cx: 26, cy: 110, r: 8, fill: "#f5f5fa" }));
  const names = steps.slice(0, 4);
  names.forEach((step, index) => {
    const x = 50 + index * 78;
    rect(root, x, 92, 64, 36, color[step.group], 18);
    text(root, x + 32, 114, shortName(step.name, 9), { size: 9 });
    arrow(root, `M${x - 14} 110 L${x - 2} 110`);
  });
  root.append(svg("path", { d: "M150 92 C 150 50, 110 50, 110 90", stroke: "var(--xwflow-red)", "stroke-width": 1.6, fill: "none", "marker-end": "url(#xwflow-arrow)" }));
  text(root, 130, 50, "retry", { size: 8, fill: "#ff8e9a" });
  root.append(svg("circle", { cx: 344, cy: 110, r: 9, fill: "none", stroke: "#f5f5fa", "stroke-width": 1.5 }));
  root.append(svg("circle", { cx: 344, cy: 110, r: 5, fill: "#f5f5fa" }));
}

function drawPetri(root: Svg): void {
  const places = [40, 140, 240, 330];
  places.forEach((x, index) => {
    root.append(svg("circle", { cx: x, cy: 110, r: 18, fill: "rgba(20,20,36,.95)", stroke: "var(--xwflow-amber)", "stroke-width": 1.6 }));
    for (let token = 0; token < (index === 1 ? 3 : index === 0 ? 1 : 0); token += 1) {
      root.append(svg("circle", { cx: x - 6 + token * 6, cy: 110, r: 3, fill: "var(--xwflow-lime)" }));
    }
    if (index < places.length - 1) {
      root.append(svg("rect", { x: x + 44, y: 92, width: 8, height: 36, fill: "#f5f5fa" }));
      arrow(root, `M${x + 18} 110 L${x + 42} 110`);
      arrow(root, `M${x + 52} 110 L${places[index + 1] - 20} 110`);
    }
  });
  text(root, 140, 150, "queue 3", { size: 9, fill: "#a9a9c2" });
}

function drawBoxes(root: Svg, steps: ThumbStep[]): void {
  const columns = ["Supplier", "Input", "Process", "Output", "Customer"];
  columns.forEach((title, index) => {
    const x = 10 + index * 70;
    text(root, x + 31, 26, title, { size: 8, fill: "#a9a9c2" });
    rect(root, x, 36, 62, 160, "rgba(255,255,255,.14)", 8, "rgba(255,255,255,.03)");
  });
  steps.slice(0, 5).forEach((step, index) => {
    rect(root, 16 + index * 70, 60 + (index % 2) * 50, 50, 40, color[step.group], 6);
    text(root, 41 + index * 70, 84 + (index % 2) * 50, shortName(step.name, 7), { size: 8 });
  });
}

function drawTree(root: Svg, steps: ThumbStep[]): void {
  rect(root, 140, 14, 80, 30, "var(--xwflow-orange)", 8);
  text(root, 180, 33, shortName(steps[2]?.name ?? "", 11), { size: 9 });
  const leaves: Array<[number, string, StepGroup]> = [
    [70, "yes", "ai"],
    [290, "no", "data"],
  ];
  leaves.forEach(([x, branch, group], index) => {
    arrow(root, `M180 44 L${x} 92`, color[group]);
    text(root, (180 + x) / 2, 70, branch, { size: 9, fill: "#a9a9c2" });
    rect(root, x - 45, 94, 90, 30, color[group], 8);
    text(root, x, 113, shortName(steps[index ? 4 : 3]?.name ?? "", 12), { size: 9 });
  });
  arrow(root, "M70 124 L70 160");
  rect(root, 25, 162, 90, 30, "var(--xwflow-violet)", 8);
  text(root, 70, 181, shortName(steps[4]?.name ?? "", 12), { size: 9 });
}

function drawTimeline(root: Svg, steps: ThumbStep[]): void {
  const bars: Array<[number, number, string]> = [
    [10, 4, "var(--xwflow-lime)"],
    [14, 150, "var(--xwflow-red)"],
    [166, 40, "var(--xwflow-cyan)"],
    [208, 6, "var(--xwflow-orange)"],
  ];
  bars.forEach(([x, w, fill], index) => {
    const y = 30 + index * 40;
    text(root, 10, y - 6, shortName(steps[index === 2 ? 1 : Math.min(index, steps.length - 1)]?.name ?? "", 18), { anchor: "start", size: 9, fill: "#a9a9c2" });
    root.append(svg("rect", { x: 10, y, width: W - 20, height: 12, rx: 6, fill: "rgba(255,255,255,.05)" }));
    root.append(svg("rect", { x: 10 + x, y, width: Math.max(4, w), height: 12, rx: 6, fill }));
  });
}

function drawCode(root: Svg, steps: ThumbStep[]): void {
  flowAsCode(steps.map((step) => step.name)).forEach((row, index) => {
    text(root, 14, 30 + index * 26, row, { anchor: "start", size: 10, mono: true, fill: index ? "#c8ff3d" : "#ff8cc5" });
  });
}

function drawList(root: Svg, steps: ThumbStep[]): void {
  steps.slice(0, 5).forEach((step, index) => {
    const indent = index >= 3 ? 26 : 0;
    const y = 14 + index * 40;
    root.append(svg("rect", { x: 12 + indent, y, width: W - 24 - indent, height: 32, rx: 8, fill: "rgba(255,255,255,.04)" }));
    root.append(svg("circle", { cx: 30 + indent, cy: y + 16, r: 7, fill: color[step.group] }));
    text(root, 46 + indent, y + 20, `${index + 1}. ${shortName(step.name, 24)}`, { anchor: "start", size: 10 });
  });
}

function drawLayers(root: Svg): void {
  const tones = ["var(--xwflow-violet)", "var(--xwflow-cyan)", "var(--xwflow-pink)"];
  tones.forEach((stroke, index) => {
    const y = 130 - index * 40;
    root.append(svg("polygon", { points: `60,${y} 200,${y - 50} 320,${y} 180,${y + 50}`, fill: "rgba(12,12,26,.8)", stroke, "stroke-width": 1.6 }));
  });
  [120, 180, 240].forEach((x, index) => root.append(svg("rect", { x, y: 40 + index * 6, width: 30, height: 18, rx: 4, fill: tones[index] })));
}

export function renderThumb(container: HTMLElement, data: XWFlowNotationThumbData, config: XWFlowNotationThumbConfig): void {
  container.className = ["xwflow-thumb", config.className].filter(Boolean).join(" ");
  const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": data.label, preserveAspectRatio: "xMidYMid meet" });
  const defs = svg("defs");
  const marker = svg("marker", { id: "xwflow-arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" });
  marker.append(svg("path", { d: "M0 0 L10 5 L0 10 z", fill: "rgba(255,255,255,.55)" }));
  defs.append(marker);
  root.append(defs);
  const style = thumbStyle(data.notation);
  const steps = data.steps;
  if (style === "graph") drawGraph(root, steps);
  else if (style === "flowchart") drawFlowchart(root, steps);
  else if (style === "swimlane") drawSwimlane(root, steps);
  else if (style === "bpmn") drawBpmn(root, steps);
  else if (style === "sequence") drawSequence(root, steps);
  else if (style === "states") drawStates(root, steps);
  else if (style === "petri") drawPetri(root);
  else if (style === "boxes") drawBoxes(root, steps);
  else if (style === "tree") drawTree(root, steps);
  else if (style === "timeline") drawTimeline(root, steps);
  else if (style === "code") drawCode(root, steps);
  else if (style === "list") drawList(root, steps);
  else drawLayers(root);
  container.replaceChildren(root);
}
