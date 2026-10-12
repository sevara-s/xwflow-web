/**
 * Dummy API: notation views of a flow.
 */
import { LATENCY_MS, clone, store, wait } from "../core.js";
import { findFlow, runDetail, settleRuns, summarize, walkOrder } from "../engine.js";

/** Which outside system each step type talks to: the lanes of the swimlane, BPMN, sequence and 3D views. */
const SYSTEM_OF_TYPE = {
  webhook: "source",
  fieldChanged: "source",
  schedule: "engine",
  http: "api",
  message: "chat",
  needsConnection: "chat",
  appendRow: "table",
  setFields: "table",
  code: "engine",
  condition: "engine",
  switch: "engine",
  merge: "engine",
  wait: "engine",
  subFlow: "engine",
  aiCondition: "engine",
};

const SYSTEMS = {
  f_order_alert: { source: "Shop", engine: "xwflow", api: "Customer API", chat: "Sales chat", table: "Orders table" },
};

/** Everything a notation view needs: steps in walk order with their system, edges, and recorded runs. */
export async function getFlowView(flowId) {
  await wait(LATENCY_MS.read);
  settleRuns();
  const flow = findFlow(flowId);
  const names = SYSTEMS[flowId] ?? { source: "Source", engine: "xwflow", api: "API", chat: "Chat", table: "Table" };
  const steps = walkOrder(flow.graph).map((node) => ({
    id: node.id,
    name: node.name,
    type: node.type,
    group: node.group,
    state: node.state,
    outputs: node.outputs,
    system: SYSTEM_OF_TYPE[node.type] ?? "engine",
  }));
  const usedSystems = ["source", "engine", ...new Set(steps.map((step) => step.system))].filter((value, index, list) => list.indexOf(value) === index);
  const runs = store.runs
    .filter((run) => run.flowId === flowId && run.status !== "running")
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((run) => runDetail(run));
  return clone({
    flow: summarize(flow),
    steps,
    edges: flow.graph.edges,
    graph: flow.graph,
    notes: flow.graph.notes,
    systems: usedSystems.map((id) => ({ id, name: names[id] ?? id })),
    runs,
    simulation: { arrivalsPerHour: 180, serviceSeconds: 50, workers: 4, overShare: 0.32, hours: 8, seed: 7 },
  });
}
