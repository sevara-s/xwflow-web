import { projectWires, railCopies } from "./XWFlowStage.logic";
import type { XWFlowStageData } from "./XWFlowStage.types";

export interface StageSlots {
  world: HTMLElement;
  reset: HTMLElement;
  zoomOut: HTMLElement;
  zoomIn: HTMLElement;
  run: HTMLElement;
  draft: HTMLElement;
  sample: HTMLElement;
  figures: HTMLElement[];
  titles: HTMLElement[];
  details: HTMLElement[];
  kinds: HTMLElement[];
}

function place(node: HTMLElement, x: number, y: number): void {
  node.style.left = `${x}%`;
  node.style.top = `${y}%`;
}

export function renderStage(container: HTMLElement, data: XWFlowStageData): StageSlots {
  container.classList.add("xwflow-stage");
  container.replaceChildren();

  const assurances = document.createElement("ul");
  assurances.className = "xwflow-assurances";
  for (const item of data.assurances) {
    const row = document.createElement("li");
    const mark = document.createElement("span");
    mark.className = "xwflow-assurances__mark";
    mark.setAttribute("aria-hidden", "true");
    row.append(mark, document.createTextNode(item));
    assurances.append(row);
  }

  const scene = document.createElement("div");
  scene.className = "xwflow-scene";
  const world = document.createElement("div");
  world.className = "xwflow-scene__world";

  const chart = document.createElement("div");
  chart.className = "xwflow-chart";
  chart.setAttribute("aria-hidden", "true");
  world.append(chart);

  for (const prop of data.props) {
    const actor = document.createElement("div");
    actor.className = `xwflow-prop is-${prop.kind}${prop.tone ? ` is-${prop.tone}` : ""}`;
    actor.dataset.id = prop.id;
    place(actor, prop.x, prop.y);
    if (prop.size) actor.style.setProperty("--xwflow-prop-size", `${prop.size}px`);
    if (prop.kind === "cube") {
      const spin = document.createElement("div");
      spin.className = "xwflow-cube";
      for (const face of ["front", "back", "right", "left", "top", "bottom"]) {
        const side = document.createElement("span");
        side.className = `xwflow-cube__face is-${face}`;
        spin.append(side);
      }
      actor.append(spin);
    }
    world.append(actor);
  }

  const wires = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  wires.setAttribute("class", "xwflow-wires");
  wires.setAttribute("viewBox", "0 0 100 100");
  wires.setAttribute("preserveAspectRatio", "none");
  wires.setAttribute("aria-hidden", "true");
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  gradient.id = "xwflow-wire-warm";
  gradient.setAttribute("x1", "0");
  gradient.setAttribute("y1", "0");
  gradient.setAttribute("x2", "1");
  gradient.setAttribute("y2", "1");
  for (const [offset, color] of [
    ["0", "#7ef0ff"],
    ["0.45", "#ffe14a"],
    ["0.72", "#ff8a3d"],
    ["1", "#ff5ea8"],
  ] as const) {
    const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop.setAttribute("offset", offset);
    stop.setAttribute("stop-color", color);
    gradient.append(stop);
  }
  defs.append(gradient);
  wires.append(defs);
  for (const wire of projectWires(data)) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", `xwflow-wire is-${wire.tone}`);
    path.setAttribute("d", wire.d);
    wires.append(path);
    if (wire.tone === "warm") {
      const runner = document.createElementNS("http://www.w3.org/2000/svg", "path");
      runner.setAttribute("class", "xwflow-wire is-warm-run");
      runner.setAttribute("d", wire.d);
      wires.append(runner);
    }
  }
  world.append(wires);

  const prompt = document.createElement("article");
  prompt.className = "xwflow-prompt";
  place(prompt, data.prompt.x, data.prompt.y);
  const kicker = document.createElement("p");
  kicker.className = "xwflow-prompt__kicker";
  kicker.textContent = data.prompt.kicker;
  const body = document.createElement("p");
  body.className = "xwflow-prompt__body";
  body.textContent = data.prompt.body;
  const draft = document.createElement("div");
  draft.className = "xwflow-pill-host is-draft";
  prompt.append(kicker, body, draft);
  world.append(prompt);

  for (const [index, node] of data.nodes.entries()) {
    const card = document.createElement("article");
    card.className = `xwflow-node is-${node.tone}`;
    card.dataset.id = node.id;
    card.style.setProperty("--i", String(index));
    card.style.transform = `translate(-50%, -50%) rotate(${node.tilt}deg)`;
    place(card, node.x, node.y);
    const icon = document.createElement("span");
    icon.className = "xwflow-node__icon";
    icon.setAttribute("aria-hidden", "true");
    const copy = document.createElement("span");
    copy.className = "xwflow-node__copy";
    const title = document.createElement("strong");
    title.textContent = node.title;
    const detail = document.createElement("em");
    detail.textContent = node.detail;
    copy.append(title, detail);
    card.append(icon, copy);
    world.append(card);
  }

  const receipt = document.createElement("article");
  receipt.className = "xwflow-receipt";
  place(receipt, data.receipt.x, data.receipt.y);
  const receiptHead = document.createElement("header");
  const receiptTitle = document.createElement("h2");
  receiptTitle.textContent = data.receipt.title;
  const sample = document.createElement("div");
  sample.className = "xwflow-pill-host is-sample";
  receiptHead.append(receiptTitle, sample);
  const rows = document.createElement("ol");
  data.receipt.rows.forEach((row, index) => {
    const item = document.createElement("li");
    item.className = `is-${row.tone}`;
    item.style.setProperty("--i", String(index));
    const name = document.createElement("span");
    name.textContent = row.label;
    const value = document.createElement("span");
    value.textContent = row.value;
    item.append(name, value);
    rows.append(item);
  });
  receipt.append(receiptHead, rows);
  world.append(receipt);

  scene.append(world);

  const controls = document.createElement("div");
  controls.className = "xwflow-stage__controls";
  const cluster = document.createElement("div");
  cluster.className = "xwflow-stage__cluster";
  const reset = document.createElement("div");
  reset.className = "xwflow-cmd is-quiet is-icon";
  reset.title = data.controls.resetLabel;
  const zoomOut = document.createElement("div");
  zoomOut.className = "xwflow-cmd is-quiet is-icon";
  zoomOut.title = data.controls.zoomOutLabel;
  const zoomIn = document.createElement("div");
  zoomIn.className = "xwflow-cmd is-quiet is-icon";
  zoomIn.title = data.controls.zoomInLabel;
  cluster.append(reset, zoomOut, zoomIn);
  const run = document.createElement("div");
  run.className = "xwflow-cmd is-lime is-compact xwflow-stage__run";
  controls.append(cluster, run);

  const metrics = document.createElement("div");
  metrics.className = "xwflow-proofs";
  const figures: HTMLElement[] = [];
  const titles: HTMLElement[] = [];
  const details: HTMLElement[] = [];
  for (const metric of data.metrics) {
    const card = document.createElement("article");
    card.className = `xwflow-proof is-${metric.tone}`;
    const figure = document.createElement("div");
    figure.className = "xwflow-proof__figure";
    const title = document.createElement("div");
    title.className = "xwflow-proof__title";
    const detail = document.createElement("div");
    detail.className = "xwflow-proof__detail";
    card.append(figure, title, detail);
    metrics.append(card);
    figures.push(figure);
    titles.push(title);
    details.push(detail);
  }

  const rail = document.createElement("div");
  rail.className = "xwflow-kindrail";
  const track = document.createElement("div");
  track.className = "xwflow-kindrail__track";
  const kinds: HTMLElement[] = [];
  for (const kind of railCopies(data.kinds)) {
    const host = document.createElement("div");
    host.className = `xwflow-kind is-${kind.tone}`;
    track.append(host);
    kinds.push(host);
  }
  rail.append(track);

  const next = document.createElement("p");
  next.className = "xwflow-next";
  next.textContent = data.nextKicker;

  container.append(assurances, scene, controls, metrics, rail, next);
  return { world, reset, zoomOut, zoomIn, run, draft, sample, figures, titles, details, kinds };
}
