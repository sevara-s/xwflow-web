/**
 * Dummy API: workspace, flows, runs, connections and the assistant.
 */
import { nodeTypes } from "../data/site.js";
import { linearGraph } from "../data/studio.js";
import { clone, GROUP_ORDER, listeners, matches, nextId, notFound, read, save, STEP_MS, store, write } from "../core.js";
import { findFlow, flowCounts, runCounts, runDetail, runSummary, scheduleSettle, settleRuns, summarize, walkOrder } from "../engine.js";

export async function getWorkspace() {
  await read();
  const { usage, ...rest } = store.workspace;
  return clone({ ...rest, usage: { ...usage, ratio: usage.included ? usage.used / usage.included : 0 } });
}

/** Lets live screens refresh when the dummy engine changes data. */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}


export async function listFlows(query = {}) {
  await read();
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
  await read();
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
    palette: GROUP_ORDER.map((group) => ({
      group,
      items: nodeTypes.filter((type) => type.group === group).map(({ id, label }) => ({ id, label, group })),
    })),
    latestRunId: recorded ? recorded.id : null,
  });
}

export async function createFlow({ name, folder }) {
  await write();
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
  await write();
  const flow = findFlow(flowId);
  flow.status = "published";
  flow.updatedAt = Date.now();
  save();
  return clone(summarize(flow));
}

export async function updateStep(flowId, nodeId, patch) {
  await write();
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
  await write();
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
  await write();
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


export async function listRuns(query = {}) {
  await read();
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
  await read();
  settleRuns();
  const run = store.runs.find((item) => item.id === runId);
  if (!run) throw notFound("Run", runId);
  return clone(runDetail(run));
}

export async function startRun(flowId, mode = "test") {
  await write();
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
  await write();
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
  await write();
  const ids = new Set(runIds);
  const before = store.runs.length;
  store.runs = store.runs.filter((run) => !ids.has(run.id));
  save();
  return { deleted: before - store.runs.length };
}


export async function listConnections(query = {}) {
  await read();
  const connections = store.connections
    .filter((item) => matches(`${item.name} ${item.audience}`, query.q))
    .filter((item) => !query.health || item.health === query.health);
  return clone(connections);
}

export async function testConnection(connectionId) {
  await write();
  const connection = store.connections.find((item) => item.id === connectionId);
  if (!connection) throw notFound("Connection", connectionId);
  connection.lastUsedAt = Date.now();
  save();
  return { ok: connection.health !== "broken", latencyMs: 80 + (connection.name.length * 7) % 90 };
}

export async function reconnectConnection(connectionId) {
  await write();
  const connection = store.connections.find((item) => item.id === connectionId);
  if (!connection) throw notFound("Connection", connectionId);
  connection.health = "healthy";
  connection.brokenFlow = null;
  connection.expiresAt = connection.auth === "oauth" ? Date.now() + 90 * 24 * 60 * 60 * 1000 : null;
  save();
  return clone(connection);
}

export async function addConnection({ name, auth, audience }) {
  await write();
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
  await read();
  return clone(store.connections.map(({ id, name, health }) => ({ id, name, health })));
}


function draftFor(prompt) {
  const text = prompt.toLowerCase();
  const scored = store.draftRecipes
    .map((recipe) => ({ recipe, score: recipe.keywords.filter((word) => text.includes(word)).length }))
    .sort((a, b) => b.score - a.score);
  const recipe = scored[0].recipe;
  return { prompt, title: recipe.title, graph: linearGraph(recipe.steps) };
}

export async function getAssistantHome() {
  await read();
  const { suggestions, activeSuggestion, starters, recommended } = store.assistant;
  const active = suggestions.find((item) => item.id === activeSuggestion) ?? suggestions[0];
  const preview = draftFor(active.label);
  return clone({ suggestions, activeSuggestion, starters, recommended, preview: { title: preview.title, graph: preview.graph } });
}

export async function draftFlow(prompt) {
  await write(400);
  return clone(draftFor(prompt));
}

export async function saveDraft(draft) {
  await write();
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
