import { downloadText } from "../../app/exporters";
import { fill } from "../../app/format";
import { notify } from "../../app/notify";
import { catalog } from "../../content/catalog";
import type { Attempt, FlowGraph, FlowView, SystemId } from "../../types/domain";
import { canvasData, hueOf, nodeStatuses } from "../../ui/flow";
import { button, glass, row, stack, text, type Hue, type Node } from "../../ui/kit";
import type { ViewPart, ViewPartContext } from "./view";

const words = catalog.views.space;
const laneHues: Record<SystemId, Hue> = { source: "cyan", engine: "lime", api: "orange", chat: "pink", table: "violet" };
const STEP_MS = 650;

type Scene = { zoom(factor: number): void; reset(): void; setData(data: object): void; updateConfig(patch: object): void };
type Changeable<T> = { onChange(handler: (value: T) => void): void };

export function spacePart(view: FlowView, { instance, onLeave }: ViewPartContext): ViewPart {
  const run = view.runs.find((item) => item.attempts.some((attempt) => attempt.result.kind === "failed")) ?? view.runs[0];
  const attempts: Attempt[] = run?.attempts ?? [];
  const options = { lanes: true, height: true, failedOnly: false, laneBy: "system" as "system" | "group" };
  let tilt = 56;
  let spin = -24;
  const scene = (): Scene | undefined => instance<Scene>("space-scene");

  /** Steps by column, one floor band per system (or per step type). */
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

  /** Higher steps took longer. */
  const depths = (): Record<string, number> | undefined => {
    if (!options.height) return undefined;
    const longest = Math.max(1, ...attempts.map((attempt) => attempt.durationMs ?? 0));
    return Object.fromEntries(attempts.map((attempt) => [attempt.nodeId, 30 + Math.round(((attempt.durationMs ?? 0) / longest) * 110)]));
  };

  const lanes = (): Array<{ label: string; hue: Hue }> =>
    !options.lanes
      ? []
      : options.laneBy === "system"
        ? view.systems.map((system) => ({ label: system.name.toUpperCase(), hue: laneHues[system.id] }))
        : [...new Set(view.steps.map((step) => step.group))].map((group) => ({ label: catalog.studio.groupLabels[group].toUpperCase(), hue: hueOf[group] }));

  /** The scene data after `played` attempts: what ran so far, and the next step marked running. */
  const sceneData = (played = attempts.length): Record<string, unknown> => {
    const current = graph();
    const live = attempts.slice(0, played);
    const statuses = nodeStatuses(current, live);
    const next = attempts[played];
    if (played < attempts.length && next) statuses[next.nodeId] = { tone: "run", label: catalog.site.landing.scene.running };
    return { ...canvasData(current, { statuses, attempts: live, frames: false }), depths: depths(), lanes: lanes() };
  };
  const rebuild = (played?: number): void => scene()?.setData(sceneData(played));

  const timers: number[] = [];
  onLeave(() => timers.splice(0).forEach((id) => clearTimeout(id)));
  const replay = (): void => {
    timers.splice(0).forEach((id) => clearTimeout(id));
    for (let played = 0; played <= attempts.length; played += 1) timers.push(window.setTimeout(() => rebuild(played), played * STEP_MS));
  };

  const toggle = (label: string, key: "lanes" | "height" | "failedOnly"): Node =>
    row(
      [
        {
          tag: "xwui-switch",
          data: { checked: options[key], label: "" },
          config: { size: "sm", ariaLabel: label },
          ref: (control) =>
            (control as Changeable<boolean>).onChange((checked) => {
              options[key] = checked;
              rebuild();
            }),
        },
        text("small", label),
      ],
      { gap: 12 },
    );
  const turn = (by: number): void => {
    spin = Math.max(-80, Math.min(80, spin + by));
    scene()?.updateConfig({ tilt: { x: tilt, z: spin } });
  };

  const camera = glass(
    stack(
      [
        text("small", words.camera, { bold: true }),
        row(
          [
            button("glass", "", { size: "sm", icon: "rotate-ccw", label: words.rotateLeft, onClick: () => turn(-15) }),
            button("glass", "", { size: "sm", icon: "rotate-cw", label: words.rotateRight, onClick: () => turn(15) }),
            button("glass", "", { size: "sm", icon: "zoom-in", label: words.zoomIn, onClick: () => scene()?.zoom(1.15) }),
            button("glass", "", { size: "sm", icon: "zoom-out", label: words.zoomOut, onClick: () => scene()?.zoom(1 / 1.15) }),
            button("glass", "", { size: "sm", icon: "maximize", label: words.reset, onClick: () => scene()?.reset() }),
          ],
          { gap: 6, wrap: true },
        ),
        stack(
          [
            row([text("small", words.tilt), { tag: "xwui-composer", key: "space-tilt", data: { tree: text("xs", fill(words.tiltValue, { n: tilt }), { mono: true }) } }], { justify: "space-between" }),
            {
              tag: "xwui-slider",
              data: { value: tilt },
              config: { min: 20, max: 70, step: 1, ariaLabel: words.tilt },
              ref: (slider) =>
                (slider as Changeable<number>).onChange((value) => {
                  tilt = Math.round(Number(value));
                  instance<{ setTree(tree: Node): void }>("space-tilt")?.setTree(text("xs", fill(words.tiltValue, { n: tilt }), { mono: true }));
                  scene()?.updateConfig({ tilt: { x: tilt, z: spin } });
                }),
            },
          ],
          { gap: 6 },
        ),
        text("small", words.layout, { bold: true }),
        toggle(words.lanesAsFloors, "lanes"),
        toggle(words.heightDuration, "height"),
        toggle(words.failedOnly, "failedOnly"),
        {
          tag: "xwui-select",
          data: { label: words.laneBy, value: options.laneBy, options: catalog.views.swimlane.laneOptions.map((item) => ({ ...item })) },
          config: { fullWidth: true },
          ref: (select) =>
            (select as Changeable<unknown>).onChange((value) => {
              options.laneBy = String(value) === "group" ? "group" : "system";
              rebuild();
            }),
        },
        button("primary", words.replay, { icon: "play", onClick: replay }),
      ],
      { gap: 12 },
    ),
    { pad: "m" },
  );

  return {
    bare: true,
    stage: {
      tag: "xwui-flow-scene",
      key: "space-scene",
      data: sceneData(),
      config: { width: 1100, height: 560, nodeWidth: 170, orbit: true, ring: false, tilt: { x: tilt, z: spin }, sceneHeight: 640 },
      slots: { overlayEnd: camera },
    },
    footer: [text("xs", words.legend, { tone: "secondary" })],
    export: () => {
      const layout = graph().nodes.map(({ id, name, x, y }) => ({ id, name, x, y, height: depths()?.[id] ?? null }));
      downloadText("flow-3d.json", JSON.stringify(layout, null, 2), "application/json");
      notify(fill(catalog.views.exported, { name: "flow-3d.json" }), "success");
    },
  };
}
