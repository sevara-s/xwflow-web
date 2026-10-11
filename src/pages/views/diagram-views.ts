import { downloadText, toBpmnXml, toMermaidSequence, toPlantUmlSequence } from "../../app/exporters";
import { fill } from "../../app/format";
import { notify } from "../../app/notify";
import { navigate, paths } from "../../app/router";
import { catalog } from "../../content/catalog";
import type { Attempt, FlowView, RunDetail, SystemId, ViewStep } from "../../types/domain";
import { hueOf, stepType } from "../../ui/flow";
import { button, row, stack, tag, text, type Hue, type Node } from "../../ui/kit";
import type { XWUIComposer, XWUISelect } from "../../xwui";
import type { ViewPart, ViewPartContext } from "./view";

type DiagramMode = "flowchart" | "swimlane" | "bpmn" | "sequence";

const words = catalog.views;
const labels = words.diagram;
const systemHue: Record<SystemId, Hue> = { source: "cyan", engine: "violet", api: "orange", chat: "pink", table: "lime" };

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** ISO 5807 shape of a step. */
function shapeOf(step: ViewStep): string {
  if (step.group === "trigger") return "terminal";
  if (step.type === "condition" || step.outputs > 1) return "decision";
  if (step.type === "http") return "call";
  if (step.type === "message" || step.type === "needsConnection") return "io";
  if (step.type === "appendRow") return "store";
  return "process";
}

function edges(view: FlowView): Node["data"] {
  return {
    edges: view.edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      label: edge.label === "yes" ? labels.yes : edge.label === "no" ? labels.no : edge.label,
      tone: edge.label === "yes" ? "yes" : edge.label === "no" ? "no" : undefined,
      dashed: edge.style === "idle",
    })),
  };
}

/** One sequence row per attempt of the run, in order. */
function messages(view: FlowView, attempts: Attempt[]): unknown[] {
  const stepOf = new Map(view.steps.map((step) => [step.id, step]));
  return attempts.flatMap((attempt) => {
    const step = stepOf.get(attempt.nodeId);
    if (!step) return [];
    const kind = attempt.result.kind;
    const base = { id: attempt.id, hue: hueOf[step.group] };
    if (step.system === "source") return [{ ...base, kind: "in", label: step.name, lane: "source" }];
    if (kind === "disabled" || kind === "notRun") return [{ ...base, kind: "skip", label: `${step.name}: ${kind === "disabled" ? labels.skipped : labels.notRun}`, lane: step.system }];
    if (step.system === "engine") {
      if (step.outputs > 1) return [{ ...base, kind: "branch", label: `[${step.name}]${kind === "branch" ? ` → ${attempt.result.branch}` : ""}` }];
      return [{ ...base, kind: "note", label: `${step.name}: ${labels.noMessage}` }];
    }
    const failed = kind === "failed";
    return [
      {
        ...base,
        kind: "call",
        label: step.name,
        lane: step.system,
        reply: attempt.result.kind === "failed" ? String(attempt.result.code) : attempt.result.kind === "branch" ? attempt.result.branch : labels.accepted,
        failed,
        retry: failed ? labels.retryWait : undefined,
      },
    ];
  });
}

function diagram(view: FlowView, mode: DiagramMode, laneBy: "system" | "group", run: RunDetail | undefined): Node {
  const title = fill(words.titles[mode], { flow: view.flow.name });
  const groups = [...new Set(view.steps.map((step) => step.group))];
  const swimLanes =
    laneBy === "group"
      ? groups.map((group) => ({ id: group, name: catalog.studio.groupLabels[group], hue: hueOf[group] }))
      : view.systems.map((system) => ({ id: system.id, name: system.name, hue: systemHue[system.id] }));
  const chat = view.systems.find((system) => system.id === "chat");
  const steps = view.steps.map((step) => ({
    id: step.id,
    name: step.name,
    shape: shapeOf(step),
    hue: hueOf[step.group],
    lane: mode === "bpmn" ? (step.system === "chat" ? "people" : "automation") : laneBy === "group" ? step.group : step.system,
    disabled: step.state === "disabled",
    subtitle: mode === "flowchart" ? stepType(step.type, step.group).label : undefined,
    error: mode === "bpmn" && step.type === "http" ? labels.notFound : undefined,
    store: mode === "bpmn" && step.type === "appendRow" ? view.systems.find((system) => system.id === "table")?.name : undefined,
  }));
  const data: Record<string, unknown> = { title, steps, ...edges(view) };
  if (mode === "flowchart") {
    // ISO 5807 as the prototype draws it: a Start terminal, the trigger as input, an End
    // terminal after every last step, and a loop on each step the run had to retry.
    const sinks = view.steps.filter((step) => !view.edges.some((edge) => edge.from === step.id));
    const retried = new Set((run?.attempts ?? []).filter((attempt) => (attempt.tryIndex ?? 1) > 1).map((attempt) => attempt.nodeId));
    const first = view.steps[0];
    data.steps = [
      { id: "__start", name: labels.start, shape: "terminal", hue: "lime" },
      ...steps.map((step) => (step.id === first?.id ? { ...step, shape: "io" } : step)),
      { id: "__end", name: labels.end, shape: "terminal", hue: "lime" },
    ];
    data.edges = [
      ...(first ? [{ from: "__start", to: first.id }] : []),
      ...(data.edges as unknown[]),
      ...[...retried].map((id) => ({ from: id, to: id, label: labels.retryLoop })),
      ...sinks.map((step) => ({ from: step.id, to: "__end" })),
    ];
  }
  if (mode === "swimlane") data.lanes = swimLanes;
  if (mode === "bpmn") {
    data.lanes = [
      { id: "automation", name: labels.automation, hue: "violet" },
      { id: "people", name: chat?.name ?? "", hue: "pink" },
    ];
    const source = view.systems.find((system) => system.id === "source");
    data.external = source ? { name: source.name, note: labels.blackBox } : null;
  }
  if (mode === "sequence") {
    data.lanes = view.systems.map((system) => ({ id: system.id, name: system.name, hue: systemHue[system.id] }));
    data.actor = "engine";
    data.messages = messages(view, run?.attempts ?? []);
    data.labels = { alt: labels.alt };
  }
  return {
    tag: "xwui-notation-diagram",
    key: "notation-diagram",
    data,
    config: { mode },
    ref: (instance) => {
      if (mode !== "sequence" || !run) return;
      (instance as { on(event: "select", handler: (detail: { id: string }) => void): void }).on("select", ({ id }) => navigate(paths.run(run.id), { attempt: id }));
    },
  };
}

function legend(items: readonly string[]): Node[] {
  return items.map((item) => tag(item));
}

export function diagramPart(view: FlowView, mode: DiagramMode, { instance }: ViewPartContext): ViewPart {
  let run = view.runs.find((item) => item.attempts.some((attempt) => attempt.result.kind === "failed")) ?? view.runs[0];
  let laneBy: "system" | "group" = "system";
  const fileBase = slug(view.flow.name);
  const redraw = (): void => instance<XWUIComposer>("notation-stage")?.setTree(diagram(view, mode, laneBy, run));
  const exportText = (name: string, content: string, type: string): void => {
    downloadText(name, content, type);
    notify(fill(words.exported, { name }), "success");
  };
  const select = (label: string, value: string, options: Array<{ value: string; label: string }>, onPick: (value: string) => void): Node => ({
    tag: "xwui-select",
    data: { label, value, options },
    config: {},
    ref: (picked) => (picked as XWUISelect).onChange((next) => onPick(String(next))),
  });

  let footer: Node[] = [];
  if (mode === "flowchart") {
    footer = [text("small", words.flowchart.legendTitle, { bold: true }), ...legend(words.flowchart.legend), text("xs", words.flowchart.note, { tone: "secondary" })];
  }
  if (mode === "swimlane") {
    const lanes = new Set(view.steps.map((step) => step.system)).size;
    const handoffs = view.edges.filter((edge) => {
      const from = view.steps.find((step) => step.id === edge.from);
      const to = view.steps.find((step) => step.id === edge.to);
      return from && to && from.system !== to.system;
    }).length;
    const retries = run ? run.attempts.filter((attempt) => (attempt.tryIndex ?? 1) > 1).length : 0;
    footer = [
      ...(
        [
          [words.swimlane.lanes, lanes],
          [words.swimlane.handoffs, handoffs],
          [words.swimlane.retries, retries],
        ] as const
      ).map(([label, value]) => row([text("disp", String(value)), text("xs", label, { tone: "secondary" })], { gap: "s", align: "center" })),
      select(words.swimlane.laneBy, laneBy, words.swimlane.laneOptions.map((item) => ({ ...item })), (value) => {
        laneBy = value === "group" ? "group" : "system";
        redraw();
      }),
    ];
  }
  if (mode === "bpmn") {
    footer = [
      select(words.bpmn.version, words.bpmn.versions[0], words.bpmn.versions.map((value) => ({ value, label: value })), () => undefined),
      ...legend(words.bpmn.legend),
      tag(words.bpmn.valid, "lime", undefined, true),
      button("glass", words.bpmn.exportXml, {
        size: "sm",
        onClick: () => exportText(`${fileBase}.bpmn`, toBpmnXml(fileBase.replace(/-/g, "_"), view.flow.name, view.steps, view.edges), "application/xml"),
      }),
    ];
  }
  if (mode === "sequence") {
    footer = [
      stack([text("small", words.sequence.title, { bold: true }), text("xs", words.sequence.hint, { tone: "secondary" })], { gap: "xs" }),
      ...(view.runs.length ? [] : [text("small", words.sequence.noRuns, { tone: "secondary" })]),
      select(
        words.sequence.run,
        run?.id ?? "",
        view.runs.map((item) => ({ value: item.id, label: fill(words.sequence.runOption, { id: item.id, mode: catalog.studio.runMode[item.mode].toLocaleLowerCase() }) })),
        (value) => {
          run = view.runs.find((item) => item.id === value) ?? run;
          redraw();
        },
      ),
      button("glass", words.sequence.plantUml, {
        size: "sm",
        onClick: () => exportText(`${fileBase}-${run?.id ?? "run"}.puml`, toPlantUmlSequence(run?.attempts ?? [], view.steps, view.systems), "text/plain"),
      }),
      button("glass", words.sequence.mermaid, {
        size: "sm",
        onClick: () => exportText(`${fileBase}-${run?.id ?? "run"}.mmd`, toMermaidSequence(run?.attempts ?? [], view.steps, view.systems), "text/plain"),
      }),
    ];
  }

  return {
    stage: { tag: "xwui-composer", key: "notation-stage", data: { tree: diagram(view, mode, laneBy, run) } },
    footer,
    export: () => {
      const svg = instance<{ toSvg(): string }>("notation-diagram")?.toSvg() ?? "";
      exportText(`${fileBase}-${mode}.svg`, svg, "image/svg+xml");
    },
  };
}
