/**
 * Local dummy API for xwflow. Pages reach data only through these async
 * functions. Each call waits a short, simulated network latency and returns
 * a copy, so the UI can never mutate the store by accident.
 *
 * The workspace is kept for the browser session (sessionStorage). Clearing
 * site data restores the sample workspace.
 */

import { linearGraph, seedStudio } from "./data/studio.js";

const STORE_KEY = "xwflow.dummy.v2";
const LATENCY_MS = { read: 180, write: 420 };
/** How long one step takes when the dummy engine plays a new run. */
const STEP_MS = 650;
/** How long the seeded "running now" run keeps running after load. */
const SEEDED_RUN_MS = 10 * 60_000;

let store = load();
const listeners = new Set();

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone(value) {
  return structuredClone(value);
}

function load() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Storage can be unavailable (private mode); fall back to a fresh seed.
  }
  const now = Date.now();
  const studio = seedStudio(now);
  for (const run of studio.runs) {
    if (run.status === "running") run.finishAt = now + SEEDED_RUN_MS;
  }
  return { seededAt: now, sequence: 0x7f3b, ...studio };
}

function save() {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Persistence is a convenience only.
  }
  for (const listener of listeners) listener();
}

function notFound(kind, id) {
  const error = new Error(`${kind} ${id} was not found.`);
  error.code = "not_found";
  return error;
}

function nextId(prefix) {
  store.sequence += 1;
  return `${prefix}_${store.sequence.toString(16)}`;
}

function matches(text, q) {
  return !q || text.toLowerCase().includes(q.trim().toLowerCase());
}

/* ------------------------------------------------------------------ */
/* Run engine                                                          */
/* ------------------------------------------------------------------ */

/** Finish runs whose time has come. Called before every read. */
function settleRuns() {
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

function scheduleSettle(run) {
  setTimeout(() => settleRuns(), Math.max(0, run.finishAt - Date.now()) + 20);
}

for (const run of store.runs) {
  if (run.status === "running" && run.finishAt) scheduleSettle(run);
}

/** Order a graph's nodes the way the engine walks them. */
function walkOrder(graph) {
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
function playAttempts(graph, status, startedAt) {
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

/* ------------------------------------------------------------------ */
/* Projections                                                         */
/* ------------------------------------------------------------------ */

function findFlow(id) {
  const flow = store.flows.find((item) => item.id === id);
  if (!flow) throw notFound("Flow", id);
  return flow;
}

function lastRunOf(flowId) {
  const runs = store.runs.filter((run) => run.flowId === flowId).sort((a, b) => b.startedAt - a.startedAt);
  return runs[0] ? { status: runs[0].status, at: runs[0].startedAt } : null;
}

function summarize(flow) {
  const { graph, ...rest } = flow;
  return {
    ...rest,
    chain: walkOrder(graph).map((node) => node.group),
    lastRun: lastRunOf(flow.id),
  };
}

function runSummary(run) {
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

function flowCounts() {
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return {
    published: store.flows.filter((flow) => flow.status === "published").length,
    running: store.runs.filter((run) => run.status === "running").length,
    failed24h: store.runs.filter((run) => run.status === "failed" && run.startedAt >= dayAgo).length,
    drafts: store.flows.filter((flow) => flow.status === "draft").length,
  };
}

function runCounts() {
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

function runDetail(run) {
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

/* ------------------------------------------------------------------ */
/* Workspace                                                           */
/* ------------------------------------------------------------------ */

export async function getWorkspace() {
  await wait(LATENCY_MS.read);
  const { usage, ...rest } = store.workspace;
  return clone({ ...rest, usage: { ...usage, ratio: usage.included ? usage.used / usage.included : 0 } });
}

/** Lets live screens refresh when the dummy engine changes data. */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* ------------------------------------------------------------------ */
/* Flows                                                               */
/* ------------------------------------------------------------------ */

export async function listFlows(query = {}) {
  await wait(LATENCY_MS.read);
  settleRuns();
  const flows = store.flows
    .filter((flow) => matches(`${flow.name} ${flow.folder}`, query.q))
    .filter((flow) => !query.status || flow.status === query.status)
    .filter((flow) => !query.folder || flow.folder === query.folder)
    .map(summarize);
  const folders = [...new Set(store.flows.map((flow) => flow.folder))].sort();
  return clone({ flows, counts: flowCounts(), folders });
}

export async function getFlow(flowId) {
  await wait(LATENCY_MS.read);
  settleRuns();
  const flow = findFlow(flowId);
  const steps = flow.graph.nodes.map((node) => ({
    nodeId: node.id,
    fields: store.stepDetails[node.id]?.fields ?? [],
    retry: store.stepDetails[node.id]?.retry ?? { enabled: false, tries: 1, delayMs: 0 },
  }));
  const runs = store.runs.filter((run) => run.flowId === flowId).sort((a, b) => b.startedAt - a.startedAt);
  const recorded = runs.find((run) => run.attempts) ?? runs[0];
  return clone({
    flow: summarize(flow),
    graph: flow.graph,
    steps,
    palette: store.palette,
    latestRunId: recorded ? recorded.id : null,
  });
}

export async function createFlow({ name, folder }) {
  await wait(LATENCY_MS.write);
  const flow = {
    id: nextId("f"),
    name,
    folder,
    status: "draft",
    trigger: { kind: "webhook" },
    owner: store.workspace.you,
    updatedAt: Date.now(),
    graph: linearGraph([{ id: nextId("n"), name: "Webhook", type: "webhook", group: "trigger" }]),
  };
  store.flows.unshift(flow);
  save();
  return clone(summarize(flow));
}

export async function publishFlow(flowId) {
  await wait(LATENCY_MS.write);
  const flow = findFlow(flowId);
  flow.status = "published";
  flow.updatedAt = Date.now();
  save();
  return clone(summarize(flow));
}

export async function updateStep(flowId, nodeId, patch) {
  await wait(LATENCY_MS.write);
  const flow = findFlow(flowId);
  const node = flow.graph.nodes.find((item) => item.id === nodeId);
  if (!node) throw notFound("Step", nodeId);
  if (patch.name) node.name = patch.name;
  if (patch.state) node.state = patch.state;
  const detail = store.stepDetails[nodeId] ?? { fields: [], retry: { enabled: false, tries: 1, delayMs: 0 } };
  if (patch.fields) {
    for (const [fieldId, value] of Object.entries(patch.fields)) {
      const field = detail.fields.find((item) => item.id === fieldId);
      if (field) field.value = value;
    }
  }
  if (patch.retry) detail.retry = { ...detail.retry, ...patch.retry };
  store.stepDetails[nodeId] = detail;
  if (flow.status === "published") flow.status = "changed";
  flow.updatedAt = Date.now();
  save();
  return clone({ node, detail });
}

/** Move steps on the canvas. Layout changes do not count as unpublished changes. */
export async function moveSteps(flowId, positions) {
  await wait(LATENCY_MS.write);
  const flow = findFlow(flowId);
  for (const position of positions) {
    const node = flow.graph.nodes.find((item) => item.id === position.id);
    if (node) {
      node.x = Math.round(position.x);
      node.y = Math.round(position.y);
    }
  }
  save();
  return clone(flow.graph.nodes);
}

export async function addStep(flowId, item) {
  await wait(LATENCY_MS.write);
  const flow = findFlow(flowId);
  const last = walkOrder(flow.graph).at(-1);
  const node = {
    id: nextId("n"),
    name: item.label,
    type: item.id,
    group: item.group,
    x: last ? last.x + 300 : 296,
    y: last ? last.y : 360,
    state: "normal",
    outputs: 1,
  };
  flow.graph.nodes.push(node);
  if (last) flow.graph.edges.push({ from: last.id, to: node.id, style: "active" });
  if (flow.status === "published") flow.status = "changed";
  flow.updatedAt = Date.now();
  save();
  return clone(node);
}

/* ------------------------------------------------------------------ */
/* Runs                                                                */
/* ------------------------------------------------------------------ */

export async function listRuns(query = {}) {
  await wait(LATENCY_MS.read);
  settleRuns();
  const runs = store.runs
    .map(runSummary)
    .filter((run) => matches(`${run.flowName} ${run.id}`, query.q))
    .filter((run) => !query.status || run.status === query.status)
    .filter((run) => !query.mode || run.mode === query.mode)
    .filter((run) => !query.days || run.startedAt >= Date.now() - query.days * 24 * 60 * 60 * 1000)
    .sort((a, b) => b.startedAt - a.startedAt);
  return clone({ runs, counts: runCounts() });
}

export async function getRun(runId) {
  await wait(LATENCY_MS.read);
  settleRuns();
  const run = store.runs.find((item) => item.id === runId);
  if (!run) throw notFound("Run", runId);
  return clone(runDetail(run));
}

export async function startRun(flowId, mode = "test") {
  await wait(LATENCY_MS.write);
  const flow = findFlow(flowId);
  const steps = walkOrder(flow.graph).filter((node) => node.state !== "disabled").length;
  const now = Date.now();
  const run = {
    id: nextId("r"),
    flowId,
    status: "running",
    mode,
    startedAt: now,
    durationMs: null,
    finishAt: now + steps * STEP_MS,
    willFail: false,
  };
  store.runs.unshift(run);
  save();
  scheduleSettle(run);
  return clone(runSummary(run));
}

export async function retryRuns(runIds) {
  await wait(LATENCY_MS.write);
  const created = [];
  for (const runId of runIds) {
    const source = store.runs.find((item) => item.id === runId);
    if (!source) continue;
    const steps = walkOrder(findFlow(source.flowId).graph).length;
    const now = Date.now();
    const run = { id: nextId("r"), flowId: source.flowId, status: "running", mode: "retry", startedAt: now, durationMs: null, finishAt: now + steps * STEP_MS };
    store.runs.unshift(run);
    scheduleSettle(run);
    created.push(runSummary(run));
  }
  save();
  return clone(created);
}

export async function deleteRuns(runIds) {
  await wait(LATENCY_MS.write);
  const ids = new Set(runIds);
  const before = store.runs.length;
  store.runs = store.runs.filter((run) => !ids.has(run.id));
  save();
  return { deleted: before - store.runs.length };
}

/* ------------------------------------------------------------------ */
/* Connections                                                         */
/* ------------------------------------------------------------------ */

export async function listConnections(query = {}) {
  await wait(LATENCY_MS.read);
  const connections = store.connections
    .filter((item) => matches(`${item.name} ${item.audience}`, query.q))
    .filter((item) => !query.health || item.health === query.health);
  return clone(connections);
}

export async function testConnection(connectionId) {
  await wait(LATENCY_MS.write);
  const connection = store.connections.find((item) => item.id === connectionId);
  if (!connection) throw notFound("Connection", connectionId);
  connection.lastUsedAt = Date.now();
  save();
  return { ok: connection.health !== "broken", latencyMs: 80 + (connection.name.length * 7) % 90 };
}

export async function reconnectConnection(connectionId) {
  await wait(LATENCY_MS.write);
  const connection = store.connections.find((item) => item.id === connectionId);
  if (!connection) throw notFound("Connection", connectionId);
  connection.health = "healthy";
  connection.brokenFlow = null;
  connection.expiresAt = connection.auth === "oauth" ? Date.now() + 90 * 24 * 60 * 60 * 1000 : null;
  save();
  return clone(connection);
}

export async function addConnection({ name, auth, audience }) {
  await wait(LATENCY_MS.write);
  const connection = {
    id: nextId("c"),
    name,
    app: "http",
    auth,
    owner: store.workspace.you,
    health: "healthy",
    scopes: ["read"],
    audience,
    usedBy: 0,
    lastUsedAt: null,
    expiresAt: null,
    brokenFlow: null,
    group: "integration",
  };
  store.connections.unshift(connection);
  save();
  return clone(connection);
}

export async function getConnectionNames() {
  await wait(LATENCY_MS.read);
  return clone(store.connections.map(({ id, name, health }) => ({ id, name, health })));
}

/* ------------------------------------------------------------------ */
/* Assistant                                                           */
/* ------------------------------------------------------------------ */

function draftFor(prompt) {
  const text = prompt.toLowerCase();
  const scored = store.draftRecipes
    .map((recipe) => ({ recipe, score: recipe.keywords.filter((word) => text.includes(word)).length }))
    .sort((a, b) => b.score - a.score);
  const recipe = scored[0].recipe;
  return { prompt, title: recipe.title, graph: linearGraph(recipe.steps) };
}

export async function getAssistantHome() {
  await wait(LATENCY_MS.read);
  const { suggestions, activeSuggestion, starters, recommended } = store.assistant;
  const active = suggestions.find((item) => item.id === activeSuggestion) ?? suggestions[0];
  const preview = draftFor(active.label);
  return clone({ suggestions, activeSuggestion, starters, recommended, preview: { title: preview.title, graph: preview.graph } });
}

export async function draftFlow(prompt) {
  await wait(LATENCY_MS.write + 400);
  return clone(draftFor(prompt));
}

export async function saveDraft(draft) {
  await wait(LATENCY_MS.write);
  const flow = {
    id: nextId("f"),
    name: draft.title,
    folder: store.workspace.project.name,
    status: "draft",
    trigger: { kind: "webhook" },
    owner: store.workspace.you,
    updatedAt: Date.now(),
    graph: clone(draft.graph),
  };
  store.flows.unshift(flow);
  save();
  return clone(summarize(flow));
}
