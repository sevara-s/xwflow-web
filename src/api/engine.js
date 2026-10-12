/**
 * Dummy API: the run engine and the projections the operations return (summaries, counts, details).
 */
import { notFound, save, store } from "./core.js";

/** Finish runs whose time has come. Called before every read. */
export function settleRuns() {
  const now = Date.now();
  let changed = false;
  for (const run of store.runs) {
    if (run.status !== "running" || !run.finishAt || run.finishAt > now) continue;
    run.status = run.willFail ? "failed" : "succeeded";
    run.durationMs = run.finishAt - run.startedAt;
    run.attempts = playAttempts(findFlow(run.flowId).graph, run.status, run.startedAt);
    changed = true;
  }
  if (changed) save();
}

export function scheduleSettle(run) {
  setTimeout(() => settleRuns(), Math.max(0, run.finishAt - Date.now()) + 20);
}

for (const run of store.runs) {
  if (run.status === "running" && run.finishAt) scheduleSettle(run);
}

/** Order a graph's nodes the way the engine walks them. */
export function walkOrder(graph) {
  const incoming = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of graph.edges) incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  const queue = graph.nodes.filter((node) => incoming.get(node.id) === 0);
  const order = [];
  const seen = new Set();
  while (queue.length) {
    const node = queue.shift();
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    order.push(node);
    for (const edge of graph.edges.filter((item) => item.from === node.id)) {
      const target = graph.nodes.find((item) => item.id === edge.to);
      if (target) queue.push(target);
    }
  }
  return order;
}

/** Produce the attempts a run records when it plays a flow's graph. */
export function playAttempts(graph, status, startedAt) {
  const order = walkOrder(graph);
  const failAt = status === "failed" ? Math.max(1, order.length - 1) : -1;
  let offset = 0;
  return order.map((node, index) => {
    const base = { id: `${node.id}_${startedAt}`, nodeId: node.id, step: node.name, payload: "none", inCount: 0, outCount: 0 };
    if (node.state === "disabled") {
      return { ...base, tryIndex: null, tryCount: null, result: { kind: "disabled" }, durationMs: null, offsetMs: null, io: { input: {}, output: {}, error: null } };
    }
    if (failAt !== -1 && index > failAt) {
      return { ...base, tryIndex: null, tryCount: null, result: { kind: "notRun" }, durationMs: null, offsetMs: null, io: { input: {}, output: {}, error: null } };
    }
    const durationMs = node.group === "trigger" ? null : 120 + ((index * 173) % 600);
    const failed = index === failAt;
    const attempt = {
      ...base,
      tryIndex: 1,
      tryCount: 1,
      result: failed ? { kind: "failed", code: 500 } : index === 0 ? { kind: "received" } : { kind: "succeeded" },
      payload: "stored",
      inCount: index === 0 ? 0 : 1,
      outCount: failed ? 0 : 1,
      durationMs,
      offsetMs: offset,
      io: {
        input: index === 0 ? {} : { from: order[index - 1].name },
        output: failed ? {} : { ok: true, step: node.name },
        error: failed ? { status: 500, message: "The step returned an error." } : null,
      },
    };
    offset += (durationMs ?? 0) + 4;
    return attempt;
  });
}


export function findFlow(id) {
  const flow = store.flows.find((item) => item.id === id);
  if (!flow) throw notFound("Flow", id);
  return flow;
}

export function lastRunOf(flowId) {
  const runs = store.runs.filter((run) => run.flowId === flowId).sort((a, b) => b.startedAt - a.startedAt);
  return runs[0] ? { status: runs[0].status, at: runs[0].startedAt } : null;
}

export function summarize(flow) {
  const { graph, ...rest } = flow;
  return {
    ...rest,
    chain: walkOrder(graph).map((node) => node.group),
    lastRun: lastRunOf(flow.id),
  };
}

export function runSummary(run) {
  const flow = store.flows.find((item) => item.id === run.flowId);
  return {
    id: run.id,
    flowId: run.flowId,
    flowName: flow ? flow.name : run.flowId,
    status: run.status,
    mode: run.mode,
    startedAt: run.startedAt,
    durationMs: run.durationMs,
  };
}

export function flowCounts() {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return {
    published: store.flows.filter((flow) => flow.status === "published").length,
    running: store.runs.filter((run) => run.status === "running").length,
    failed24h: store.runs.filter((run) => run.status === "failed" && run.startedAt >= dayAgo).length,
    drafts: store.flows.filter((flow) => flow.status === "draft").length,
  };
}

export function runCounts() {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = store.runs.filter((run) => run.startedAt >= weekAgo);
  return {
    running: store.runs.filter((run) => run.status === "running").length,
    succeeded7d: recent.filter((run) => run.status === "succeeded" || run.status === "retried").length,
    failed7d: recent.filter((run) => run.status === "failed").length,
    asOf: Date.now(),
    perHour: store.runsPerHour,
  };
}

export function runDetail(run) {
  const flow = findFlow(run.flowId);
  const attempts = run.attempts ?? playAttempts(flow.graph, run.status === "running" ? "succeeded" : run.status, run.startedAt);
  const groups = new Map(flow.graph.nodes.map((node) => [node.id, node.group]));
  const visible = (run.status === "running" ? attempts.slice(0, 1) : attempts).map((item) => ({
    ...item,
    group: groups.get(item.nodeId) ?? "integration",
  }));
  const steps = new Set(flow.graph.nodes.map((node) => node.id));
  const recorded = new Set(
    visible.filter((item) => item.result.kind !== "disabled" && item.result.kind !== "notRun").map((item) => item.nodeId),
  );
  const failure = visible.find((item) => item.result.kind === "failed");
  const recovered = failure ? visible.some((item) => item.nodeId === failure.nodeId && item.result.kind === "succeeded") : false;
  const sameFlow = store.runs.filter((item) => item.flowId === run.flowId).sort((a, b) => a.startedAt - b.startedAt);
  return {
    ...runSummary(run),
    number: sameFlow.findIndex((item) => item.id === run.id) + 1,
    attempts: visible,
    stepCount: steps.size,
    recordedSteps: recorded.size,
    retentionDays: store.retentionDays,
    expiresAt: run.startedAt + store.retentionDays * 24 * 60 * 60 * 1000,
    problem: failure
      ? { step: failure.step, tryIndex: failure.tryIndex, tryCount: failure.tryCount, code: failure.result.code, recovered }
      : null,
  };
}
