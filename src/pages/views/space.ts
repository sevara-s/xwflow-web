import { el, slot } from "../../app/dom";
import { downloadText } from "../../app/exporters";
import { fill } from "../../app/format";
import { notify } from "../../app/notify";
import { resultView } from "../../app/status";
import { XWFlowScene3D } from "../../components/XWFlowScene3D/XWFlowScene3D";
import { XWFlowShape } from "../../components/XWFlowShape/XWFlowShape";
import { catalog } from "../../content/catalog";
import type { Attempt, FlowGraph, SystemId } from "../../types/domain";
import { XWUIButton, XWUIInputSlider, XWUIInputSwitch, XWUISelect } from "../../xwui";
import { canvasData } from "../studio/canvas";
import { glass } from "../studio/common";
import type { ViewContext } from "./view";

const words = catalog.views.space;
const laneColors: Record<SystemId, "lime" | "cyan" | "violet" | "pink" | "orange"> = { source: "cyan", engine: "lime", api: "orange", chat: "pink", table: "violet" };
const STEP_MS = 650;

export function mount(context: ViewContext): void {
  const { view, stage, scope } = context;
  const run = view.runs.find((item) => item.attempts.some((attempt) => attempt.result.kind === "failed")) ?? view.runs[0];
  const attempts: Attempt[] = run?.attempts ?? [];
  const options = { lanes: true, height: true, failedOnly: false, laneBy: "system" as "system" | "group" };

  scope.track(new XWFlowShape(slot(stage), { kind: "orb" }, { size: 70, color: "violet", place: { left: "6%", top: "40px" } }));
  const sceneHost = slot(stage, "xwflow-views__scene");

  /** Lay steps out by column, one lane per system (or per step type). */
  const graph = (): FlowGraph => {
    const lanes = options.laneBy === "system" ? view.systems.map((system) => system.id as string) : [...new Set(view.steps.map((step) => step.group as string))];
    const laneHeight = 560 / Math.max(1, lanes.length);
    const order = new Map(view.steps.map((step, index) => [step.id, index]));
    const nodes = view.graph.nodes
      .filter((node) => !options.failedOnly || attempts.some((attempt) => attempt.nodeId === node.id && attempt.result.kind === "failed"))
      .map((node) => {
        const step = view.steps.find((item) => item.id === node.id);
        const lane = step ? lanes.indexOf(options.laneBy === "system" ? step.system : step.group) : 0;
        return { ...node, x: 40 + (order.get(node.id) ?? 0) * 200, y: options.lanes ? lane * laneHeight + laneHeight / 2 - 36 : node.y };
      });
    const ids = new Set(nodes.map((node) => node.id));
    return { nodes, edges: view.graph.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)), notes: [], frames: [] };
  };

  const depths = (): Record<string, number> | undefined => {
    if (!options.height) return undefined;
    const longest = Math.max(1, ...attempts.map((attempt) => attempt.durationMs ?? 0));
    const result: Record<string, number> = {};
    for (const attempt of attempts) result[attempt.nodeId] = 30 + Math.round(((attempt.durationMs ?? 0) / longest) * 110);
    return result;
  };

  const lanes = () =>
    options.lanes
      ? options.laneBy === "system"
        ? view.systems.map((system) => ({ label: system.name.toUpperCase(), color: laneColors[system.id] }))
        : [...new Set(view.steps.map((step) => step.group))].map((group) => ({ label: catalog.studio.groupLabels[group].toUpperCase(), color: laneColors.engine }))
      : [];

  let scene: XWFlowScene3D | null = null;
  let tilt = 56;
  const build = (played = attempts.length): void => {
    scene?.destroy();
    sceneHost.replaceChildren();
    const live = attempts.slice(0, played);
    const data = { ...canvasData(graph(), null, live), depths: depths() };
    if (played < attempts.length && attempts[played]) {
      const next = attempts[played];
      if (data.views[next.nodeId]) data.views[next.nodeId] = { ...data.views[next.nodeId], status: { tone: "run", label: catalog.site.landing.scene.running } };
    }
    for (const attempt of live) {
      if (data.views[attempt.nodeId] && attempt.result.kind === "failed") data.views[attempt.nodeId].status = resultView(attempt.result);
    }
    scene = new XWFlowScene3D(sceneHost, data, { width: 1100, height: 560, nodeWidth: 170, orbit: true, ring: false, lanes: lanes(), tilt: { x: tilt, z: -24 } });
  };
  scope.track({ destroy: () => scene?.destroy() });
  build();

  /* Camera and layout panel. */
  const panel = glass(stage, { pad: "m", className: "xwflow-stack xwflow-gap-12 xwflow-views__camera", label: words.camera });
  panel.append(el("b", undefined, words.camera));
  const cameraRow = el("div", "xwflow-row xwflow-gap-8");
  panel.append(cameraRow);
  const cameraButton = (icon: string, label: string, action: () => void): void => {
    const button = scope.track(new XWUIButton(slot(cameraRow), { text: "" }, { variant: "ghost", size: "sm", icon, ariaLabel: label, title: label, className: "xwflow-btn-glass" }));
    button.onClick(action);
  };
  cameraButton("rotate-ccw", words.rotateLeft, () => rotate(-15));
  cameraButton("rotate-cw", words.rotateRight, () => rotate(15));
  cameraButton("zoom-in", words.zoomIn, () => scene?.zoom(1.15));
  cameraButton("zoom-out", words.zoomOut, () => scene?.zoom(1 / 1.15));
  cameraButton("maximize", words.reset, () => scene?.reset());
  let spin = -24;
  function rotate(by: number): void {
    spin = Math.max(-80, Math.min(80, spin + by));
    sceneHost.querySelector<HTMLElement>(".xwflow-scene")?.style.setProperty("--xwflow-scene-z", `${spin}deg`);
  }

  const tiltRow = el("div", "xwflow-row xwflow-gap-12");
  panel.append(tiltRow);
  tiltRow.append(el("span", "xwflow-label", words.tilt));
  const tiltSlider = scope.track(new XWUIInputSlider(slot(tiltRow, "xwflow-grow"), { value: tilt }, { min: 20, max: 70, step: 1, ariaLabel: words.tilt }));
  const tiltValue = el("span", "xwflow-mono xwflow-xs", fill(words.tiltValue, { n: tilt }));
  tiltRow.append(tiltValue);
  tiltSlider.onChange((value) => {
    tilt = Math.round(Number(value));
    tiltValue.textContent = fill(words.tiltValue, { n: tilt });
    sceneHost.querySelector<HTMLElement>(".xwflow-scene")?.style.setProperty("--xwflow-scene-x", `${tilt}deg`);
  });

  panel.append(el("b", undefined, words.layout));
  const toggle = (label: string, key: "lanes" | "height" | "failedOnly"): void => {
    const row = el("div", "xwflow-row xwflow-gap-12");
    panel.append(row);
    const control = scope.track(new XWUIInputSwitch(slot(row), { checked: options[key], label: "" }, { size: "sm", ariaLabel: label }));
    row.append(el("span", "xwflow-small", label));
    control.onChange((checked) => {
      options[key] = checked;
      build();
    });
  };
  toggle(words.lanesAsFloors, "lanes");
  toggle(words.heightDuration, "height");
  toggle(words.failedOnly, "failedOnly");
  const laneSelect = scope.track(
    new XWUISelect(slot(panel), { label: words.laneBy, value: options.laneBy, options: catalog.views.swimlane.laneOptions.map((item) => ({ ...item })) }, { fullWidth: true }),
  );
  laneSelect.onChange((value) => {
    options.laneBy = String(value) === "group" ? "group" : "system";
    build();
  });

  const replay = scope.track(new XWUIButton(slot(panel), { text: words.replay }, { variant: "primary", icon: "play", fullWidth: true }));
  const timers: number[] = [];
  scope.track({ destroy: () => timers.splice(0).forEach((id) => clearTimeout(id)) });
  replay.onClick(() => {
    timers.splice(0).forEach((id) => clearTimeout(id));
    for (let played = 0; played <= attempts.length; played += 1) timers.push(window.setTimeout(() => build(played), played * STEP_MS));
  });
  stage.append(el("p", "xwflow-xs xwflow-sec xwflow-views__legend-note", words.legend));

  context.setExport(() => {
    const layout = graph().nodes.map(({ id, name, x, y }) => ({ id, name, x, y, height: depths()?.[id] ?? null }));
    downloadText("flow-3d.json", JSON.stringify(layout, null, 2), "application/json");
    notify(fill(catalog.views.exported, { name: "flow-3d.json" }), "success");
  });
}
