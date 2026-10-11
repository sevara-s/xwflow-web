/**
 * Local dummy API for xwflow. Pages reach data only through these async
 * functions. Each call waits a short, simulated network latency and returns
 * a copy, so the UI can never mutate the store by accident.
 *
 * The workspace is kept for the browser session (sessionStorage). Clearing
 * site data restores the sample workspace.
 */

import { seedAdmin } from "./data/admin.js";
import { seedProject } from "./data/project.js";
import { seedWorkspace, templates } from "./data/workspace.js";
import { dialects, nodeTypes, notations, pricing, selfHost, tenants } from "./data/site.js";
import { linearGraph, seedStudio } from "./data/studio.js";

const STORE_KEY = "xwflow.dummy.v4";
const GROUP_ORDER = ["trigger", "control", "data", "ai", "integration"];
/**
 * A token delay so every call stays asynchronous, as a real API's would. It
 * was 180 ms per read and 420 ms per write, which made every page change wait
 * on purpose; the local stand-in has no network to simulate that well.
 */
const LATENCY_MS = { read: 15, write: 40 };
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
    if (raw) {
      const stored = JSON.parse(raw);
      // A session saved before the project areas existed gets their sample data.
      stored.project ??= seedProject(stored.seededAt ?? Date.now());
      stored.extras ??= seedWorkspace(stored.seededAt ?? Date.now());
      return stored;
    }
  } catch {
    // Storage can be unavailable (private mode); fall back to a fresh seed.
  }
  const now = Date.now();
  const studio = seedStudio(now);
  for (const run of studio.runs) {
    if (run.status === "running") run.finishAt = now + SEEDED_RUN_MS;
  }
  return { seededAt: now, sequence: 0x7f3b, ...studio, project: seedProject(now), extras: seedWorkspace(now), admin: seedAdmin(now) };
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
    palette: GROUP_ORDER.map((group) => ({
      group,
      items: nodeTypes.filter((type) => type.group === group).map(({ id, label }) => ({ id, label, group })),
    })),
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

/* ------------------------------------------------------------------ */
/* Public website                                                      */
/* ------------------------------------------------------------------ */

/** Everything the landing page shows, including the real sample flow and its receipt. */
export async function getLanding() {
  await wait(LATENCY_MS.read);
  const flow = findFlow("f_order_alert");
  const run = store.runs.find((item) => item.id === "r_7f39");
  return clone({
    stats: { connectors: nodeTypes.length, dialects: dialects.length, rowsPerAttempt: 1, vendorMarks: 0 },
    marquee: nodeTypes.map(({ id, label, group }) => ({ id, label, group })),
    flow: { id: flow.id, name: flow.name, graph: flow.graph },
    receipt: run ? runDetail(run) : null,
    tenants,
    notations: notations.map(({ id, name, family, view, concept }) => ({ id, name, family, view, concept })),
    dialects,
  });
}

export async function listNodeTypes(query = {}) {
  await wait(LATENCY_MS.read);
  const items = nodeTypes
    .filter((type) => !query.group || type.group === query.group)
    .filter((type) => matches(`${type.label} ${type.summary}`, query.q));
  return clone({ items, total: nodeTypes.length });
}

export async function getPricing() {
  await wait(LATENCY_MS.read);
  return clone(pricing);
}

export async function getSelfHost() {
  await wait(LATENCY_MS.read);
  return clone(selfHost);
}

/** The gallery, plus the sample flow every thumbnail draws so each notation shows the same flow. */
export async function getNotations(query = {}) {
  await wait(LATENCY_MS.read);
  const flow = findFlow("f_order_alert");
  const run = store.runs.find((item) => item.flowId === flow.id && item.attempts);
  return clone({
    items: notations.filter((item) => !query.family || item.family === query.family),
    total: notations.length,
    sample: {
      flowId: flow.id,
      runId: run ? run.id : null,
      steps: walkOrder(flow.graph).map(({ id, name, type, group }) => ({ id, name, type, group })),
    },
  });
}

/** The pricing contact form. The dummy API only validates and acknowledges. */
export async function requestQuote({ email, need }) {
  await wait(LATENCY_MS.write);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email ?? "")) {
    const error = new Error("Enter a work email address.");
    error.code = "invalid_email";
    throw error;
  }
  if (!need || !need.trim()) {
    const error = new Error("Say what you want to run.");
    error.code = "missing_need";
    throw error;
  }
  store.sequence += 1;
  save();
  return { reference: `Q-${store.sequence.toString(16).toUpperCase()}` };
}

/* ------------------------------------------------------------------ */
/* Admin and system                                                    */
/* ------------------------------------------------------------------ */

function commercialOnly() {
  const error = new Error("Per-tenant branding requires Commercial.");
  error.code = "requires_commercial";
  return error;
}

/** Tenant, plan and the worst service state, for the admin shell. */
export async function getAdminContext() {
  await wait(LATENCY_MS.read);
  const { tenant, services } = store.admin;
  const worst = services.some((item) => item.state === "err") ? "err" : services.some((item) => item.state === "warn") ? "warn" : "ok";
  return clone({ tenant, health: worst });
}

export async function getAdminOverview() {
  await wait(LATENCY_MS.read);
  const { overview, services } = store.admin;
  return clone({ ...overview, reachability: services.filter((item) => item.reach) });
}

export async function getBranding() {
  await wait(LATENCY_MS.read);
  return clone({ ...store.admin.branding, plan: store.admin.tenant.plan });
}

export async function saveBranding(kit) {
  await wait(LATENCY_MS.write);
  if (store.admin.tenant.plan !== "commercial") throw commercialOnly();
  store.admin.branding = { ...store.admin.branding, ...kit };
  save();
  return clone(store.admin.branding);
}

export async function listAudit(query = {}) {
  await wait(LATENCY_MS.read);
  const days = query.days ?? store.admin.auditRetentionDays;
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const all = store.admin.audit;
  const events = all
    .filter((item) => item.at >= since)
    .filter((item) => !query.actor || item.actor.name === query.actor)
    .filter((item) => !query.actorClass || item.actor.class === query.actorClass)
    .filter((item) => !query.action || item.kind === query.action)
    .filter((item) => !query.objectType || item.object.type === query.objectType)
    .sort((a, b) => b.at - a.at);
  return clone({
    events,
    retentionDays: store.admin.auditRetentionDays,
    actors: [...new Set(all.map((item) => item.actor.name))],
    actions: [...new Set(all.map((item) => item.kind))],
    objectTypes: [...new Set(all.map((item) => item.object.type))],
  });
}

export async function getHealth() {
  await wait(LATENCY_MS.read);
  const { checks, uptime, log, services } = store.admin;
  return clone({ checks, uptime, log, services });
}

/**
 * Run every check again. In the sample, storage answers on the next check,
 * so "Check again" shows a recovery; the scheduler heartbeat stays late.
 */
export async function recheckHealth() {
  await wait(LATENCY_MS.write + 300);
  const now = Date.now();
  const { admin } = store;
  for (const check of admin.checks) check.checkedAt = now;
  const storage = admin.checks.find((item) => item.id === "storage");
  if (storage && storage.state === "err") {
    storage.state = "ok";
    storage.summary = "answering";
    storage.detail = { lastGood: now };
    const service = admin.services.find((item) => item.id === "storage");
    if (service) service.state = "ok";
    admin.log.unshift({ at: now, source: "storage", tone: "ok", message: "answering again" });
    const days = admin.uptime.find((item) => item.service === "Storage")?.days;
    if (days) days[days.length - 1] = "warn";
  }
  save();
  return clone({ checks: admin.checks, uptime: admin.uptime, log: admin.log, services: admin.services });
}

export async function pauseSchedules() {
  await wait(LATENCY_MS.write);
  const scheduled = store.flows.filter((flow) => flow.trigger.kind !== "webhook" && flow.status !== "draft");
  store.admin.audit.unshift({
    id: nextId("e"),
    kind: "paused",
    group: "control",
    title: "All schedules paused",
    object: { name: `${scheduled.length} schedules`, type: "schedule" },
    actor: { name: "You", class: "person" },
    onBehalfOf: null,
    at: Date.now(),
  });
  save();
  return { paused: scheduled.length };
}

export async function drainWorker() {
  await wait(LATENCY_MS.write);
  const workers = store.admin.checks.find((item) => item.id === "workers");
  if (workers && workers.detail.alive > 1) workers.detail.alive -= 1;
  save();
  return clone({ worker: `worker-${workers ? workers.detail.alive + 1 : 1}`, remaining: workers ? workers.detail.alive : 0 });
}

export async function getAccessDenial() {
  await wait(LATENCY_MS.read);
  return clone({ ...store.admin.denied, yourRole: store.admin.you.role });
}

export async function requestAccess(role) {
  await wait(LATENCY_MS.write);
  store.sequence += 1;
  save();
  return { role, reference: `AR-${store.sequence.toString(16).toUpperCase()}` };
}

/* ------------------------------------------------------------------ */
/* Notation views                                                      */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Project areas: agents, tables, forms, variables, MCP servers        */
/* ------------------------------------------------------------------ */

function findIn(list, kind, id) {
  const item = list.find((entry) => entry.id === id);
  if (!item) throw notFound(kind, id);
  return item;
}

function invalid(message) {
  const error = new Error(message);
  error.code = "invalid";
  return error;
}

export async function listAgents(query = {}) {
  await wait(LATENCY_MS.read);
  const agents = store.project.agents.filter((agent) => matches(`${agent.name} ${agent.description}`, query.q ?? "") && (!query.status || agent.status === query.status));
  const all = store.project.agents;
  return clone({
    agents,
    counts: {
      live: all.filter((agent) => agent.status === "live").length,
      conversations7d: all.reduce((sum, agent) => sum + agent.conversations7d, 0),
      handoffs7d: all.reduce((sum, agent) => sum + agent.handoffs7d, 0),
    },
  });
}

/** Go live, pause or return to draft. A draft has to be published to go live. */
export async function setAgentStatus(agentId, status) {
  await wait(LATENCY_MS.write);
  const agent = findIn(store.project.agents, "Agent", agentId);
  if (!["live", "paused", "draft"].includes(status)) throw invalid(`Unknown agent status ${status}.`);
  agent.status = status;
  if (status === "live") agent.lastActiveAt = Date.now();
  save();
  return clone(agent);
}

export async function createAgent({ name, description = "" }) {
  await wait(LATENCY_MS.write);
  if (!name?.trim()) throw invalid("An agent needs a name.");
  const agent = {
    id: nextId("ag"),
    name: name.trim(),
    description: description.trim(),
    model: "Claude Sonnet 5.5",
    status: "draft",
    tools: [],
    conversations7d: 0,
    resolvedRate: null,
    handoffs7d: 0,
    lastActiveAt: null,
    owner: store.workspace.you,
    hue: "lime",
  };
  store.project.agents.unshift(agent);
  save();
  return clone(agent);
}

export async function listTables() {
  await wait(LATENCY_MS.read);
  return clone(store.project.tables.map(({ records, ...table }) => ({ ...table, columnCount: table.columns.length })));
}

export async function getTable(tableId) {
  await wait(LATENCY_MS.read);
  return clone(findIn(store.project.tables, "Table", tableId));
}

export async function listForms() {
  await wait(LATENCY_MS.read);
  return clone(store.project.forms);
}

export async function setFormStatus(formId, status) {
  await wait(LATENCY_MS.write);
  const form = findIn(store.project.forms, "Form", formId);
  if (status === "live" && !form.flow) throw invalid(`${form.name} needs a flow before it can go live.`);
  form.status = status;
  form.updatedAt = Date.now();
  save();
  return clone(form);
}

/** Secret values never leave the store: the list carries a mask instead. */
export async function listVariables(query = {}) {
  await wait(LATENCY_MS.read);
  const scope = query.scope ?? "";
  return clone(
    store.project.variables
      .filter((variable) => !scope || variable.scope === scope || variable.scope === "all")
      .filter((variable) => matches(variable.key, query.q ?? ""))
      .map(({ value, ...variable }) => ({ ...variable, value: variable.secret ? null : value })),
  );
}

export async function addVariable({ key, value, secret = false, scope = "all" }) {
  await wait(LATENCY_MS.write);
  const name = key?.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  if (!name) throw invalid("A variable needs a name.");
  if (store.project.variables.some((variable) => variable.key === name && (variable.scope === scope || variable.scope === "all" || scope === "all"))) {
    throw invalid(`${name} already exists for that environment.`);
  }
  const variable = { id: nextId("v"), key: name, value: String(value ?? ""), secret: Boolean(secret), scope, usedBy: 0, updatedAt: Date.now(), owner: store.workspace.you };
  store.project.variables.unshift(variable);
  save();
  const { value: hidden, ...shown } = variable;
  return clone({ ...shown, value: variable.secret ? null : hidden });
}

export async function deleteVariable(variableId) {
  await wait(LATENCY_MS.write);
  const variable = findIn(store.project.variables, "Variable", variableId);
  if (variable.usedBy > 0) throw invalid(`${variable.key} is used by ${variable.usedBy} step(s). Remove it from them first.`);
  store.project.variables = store.project.variables.filter((item) => item.id !== variableId);
  save();
  return { deleted: variableId };
}

export async function listMcpServers() {
  await wait(LATENCY_MS.read);
  return clone(store.project.mcpServers);
}

/** Enable or disable a server; enabling reconnects (an errored server recovers). */
export async function setMcpServerEnabled(serverId, enabled) {
  await wait(LATENCY_MS.write);
  const server = findIn(store.project.mcpServers, "MCP server", serverId);
  server.status = enabled ? "connected" : "disabled";
  server.lastError = null;
  server.latencyMs = enabled ? 200 : null;
  save();
  return clone(server);
}

export async function addMcpServer({ name, url }) {
  await wait(LATENCY_MS.write);
  if (!name?.trim()) throw invalid("A server needs a name.");
  if (!/^(https?|stdio):\/\//.test(url ?? "")) throw invalid("Use an https:// or stdio:// address.");
  const server = {
    id: nextId("mcp"),
    name: name.trim(),
    url: url.trim(),
    transport: url.startsWith("stdio") ? "stdio" : "http",
    status: "connected",
    tools: [],
    calls24h: 0,
    latencyMs: 210,
    lastError: null,
    hue: "lime",
  };
  store.project.mcpServers.push(server);
  save();
  return clone(server);
}

/* ------------------------------------------------------------------ */
/* Workspace pages: overview, templates, insights, settings, versions  */
/* ------------------------------------------------------------------ */

/** What needs a person today, worst first, plus today's numbers and the latest runs. */
export async function getOverview() {
  await wait(LATENCY_MS.read);
  settleRuns();
  const today = store.extras.insightDays.at(-1);
  const running = store.runs.filter((run) => run.status === "running").length;
  const attention = [];
  const latestByFlow = new Map();
  for (const run of [...store.runs].sort((a, b) => b.startedAt - a.startedAt)) if (!latestByFlow.has(run.flowId)) latestByFlow.set(run.flowId, run);
  for (const run of latestByFlow.values()) {
    if (run.status === "failed") attention.push({ kind: "run", id: run.id, title: findFlow(run.flowId).name, tone: "error", at: run.startedAt });
  }
  for (const connection of store.connections) {
    if (connection.health === "broken") attention.push({ kind: "connection", id: connection.id, title: connection.name, tone: "error", at: connection.expiresAt ?? Date.now() });
    if (connection.health === "expiring") attention.push({ kind: "connection", id: connection.id, title: connection.name, tone: "warning", at: connection.expiresAt ?? Date.now() });
  }
  for (const server of store.project.mcpServers) if (server.status === "error") attention.push({ kind: "mcp", id: server.id, title: server.name, tone: "error", at: Date.now() });
  for (const chat of store.workspace.chats) if (chat.waiting) attention.push({ kind: "chat", id: chat.id, title: chat.title, tone: "warning", at: Date.now() });
  for (const agent of store.project.agents) if (agent.status === "paused") attention.push({ kind: "agent", id: agent.id, title: agent.name, tone: "warning", at: agent.lastActiveAt ?? Date.now() });
  attention.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "error" ? -1 : 1));
  const recent = [...store.runs]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 5)
    .map((run) => ({ id: run.id, flowId: run.flowId, flowName: findFlow(run.flowId).name, status: run.status, mode: run.mode, startedAt: run.startedAt, durationMs: run.durationMs }));
  const flows = store.flows;
  return clone({
    you: store.workspace.you,
    today: { runs: today.succeeded + today.failed, failed: today.failed, running },
    counts: {
      published: flows.filter((flow) => flow.status !== "draft").length,
      drafts: flows.filter((flow) => flow.status === "draft").length,
      liveAgents: store.project.agents.filter((agent) => agent.status === "live").length,
      connections: store.connections.length,
    },
    week: store.extras.insightDays.slice(-7).map((day) => ({ value: day.succeeded + day.failed, alert: day.failed > 5 })),
    attention,
    recent,
  });
}

export async function listTemplates(query = {}) {
  await wait(LATENCY_MS.read);
  const category = query.category ?? "";
  const list = templates.filter((template) => (!category || template.category === category) && matches(`${template.name} ${template.summary}`, query.q ?? ""));
  return clone({ templates: list, categories: [...new Set(templates.map((template) => template.category))] });
}

/** A new draft flow built from a template's steps, ready to open in the editor. */
export async function useTemplate(templateId) {
  await wait(LATENCY_MS.write);
  const template = templates.find((item) => item.id === templateId);
  if (!template) throw notFound("Template", templateId);
  const flow = {
    id: nextId("f"),
    name: template.name,
    folder: template.category,
    status: "draft",
    trigger: { kind: template.steps[0].type === "schedule" ? "schedule" : "webhook" },
    owner: store.workspace.you,
    updatedAt: Date.now(),
    graph: linearGraph(template.steps.map((step) => ({ ...step, id: nextId("n") }))),
  };
  store.flows.unshift(flow);
  save();
  return clone(summarize(flow));
}

const FLOW_SHARE = { f_order_alert: 0.34, f_sync_customers: 0.3, f_lead_intake: 0.18, f_invoice_digest: 0.1, f_refund: 0.08 };

export async function getInsights(query = {}) {
  await wait(LATENCY_MS.read);
  const days = query.days === 7 ? 7 : 14;
  const series = store.extras.insightDays.slice(-days);
  const runs = series.reduce((sum, day) => sum + day.succeeded + day.failed, 0);
  const failed = series.reduce((sum, day) => sum + day.failed, 0);
  const timed = store.runs.filter((run) => run.durationMs !== null);
  const topFlows = Object.entries(FLOW_SHARE)
    .map(([flowId, share]) => {
      const flow = store.flows.find((item) => item.id === flowId);
      const count = Math.round(runs * share);
      return flow ? { flowId, name: flow.name, runs: count, failed: Math.round(failed * share), minutesSaved: count * store.extras.minutesSavedPerRun[flowId] } : null;
    })
    .filter(Boolean);
  return clone({
    days: series,
    totals: {
      runs,
      failed,
      successRate: runs ? (runs - failed) / runs : 1,
      avgMs: timed.length ? Math.round(timed.reduce((sum, run) => sum + run.durationMs, 0) / timed.length) : null,
      minutesSaved: topFlows.reduce((sum, flow) => sum + flow.minutesSaved, 0),
    },
    topFlows,
    causes: store.extras.insightCauses,
    slowSteps: store.extras.insightSlowSteps,
  });
}

export async function getSettings() {
  await wait(LATENCY_MS.read);
  return clone(store.extras.settings);
}

export async function saveGeneral(patch) {
  await wait(LATENCY_MS.write);
  const general = store.extras.settings.general;
  if (patch.name !== undefined && !String(patch.name).trim()) throw invalid("The workspace needs a name.");
  if (patch.retentionDays !== undefined && ![7, 30, 90].includes(Number(patch.retentionDays))) throw invalid("Keep runs for 7, 30 or 90 days.");
  Object.assign(general, patch, patch.name !== undefined ? { name: String(patch.name).trim() } : {});
  if (patch.name !== undefined) store.workspace.project.name = general.name;
  save();
  return clone(general);
}

export async function inviteMember({ email, role = "editor" }) {
  await wait(LATENCY_MS.write);
  const address = String(email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) throw invalid("Enter an email address.");
  const members = store.extras.settings.members;
  if (members.some((member) => member.email === address)) throw invalid(`${address} is already in the workspace.`);
  const member = { id: nextId("u"), name: address.split("@")[0], email: address, role, lastActiveAt: null, isYou: false, invited: true };
  members.push(member);
  save();
  return clone(member);
}

export async function setMemberRole(memberId, role) {
  await wait(LATENCY_MS.write);
  const member = findIn(store.extras.settings.members, "Member", memberId);
  if (member.role === "owner") throw invalid("The owner's role cannot change.");
  if (!["editor", "viewer"].includes(role)) throw invalid(`Unknown role ${role}.`);
  member.role = role;
  save();
  return clone(member);
}

export async function removeMember(memberId) {
  await wait(LATENCY_MS.write);
  const member = findIn(store.extras.settings.members, "Member", memberId);
  if (member.role === "owner") throw invalid("The owner cannot be removed.");
  store.extras.settings.members = store.extras.settings.members.filter((item) => item.id !== memberId);
  save();
  return { removed: memberId };
}

/** The full token is returned once, here; the list only ever shows its prefix. */
export async function createApiKey({ name, scopes = ["runs:read"] }) {
  await wait(LATENCY_MS.write);
  if (!name?.trim()) throw invalid("A key needs a name.");
  const secret = `xwf_live_${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`;
  const key = { id: nextId("k"), name: name.trim(), prefix: secret.slice(0, 13), createdAt: Date.now(), lastUsedAt: null, scopes };
  store.extras.settings.apiKeys.unshift(key);
  save();
  return clone({ key, token: secret });
}

export async function revokeApiKey(keyId) {
  await wait(LATENCY_MS.write);
  findIn(store.extras.settings.apiKeys, "API key", keyId);
  store.extras.settings.apiKeys = store.extras.settings.apiKeys.filter((key) => key.id !== keyId);
  save();
  return { revoked: keyId };
}

export async function setNotification(name, enabled) {
  await wait(LATENCY_MS.write);
  const notifications = store.extras.settings.notifications;
  if (!(name in notifications)) throw invalid(`Unknown notification ${name}.`);
  notifications[name] = Boolean(enabled);
  save();
  return clone(notifications);
}

export async function listVersions(flowId) {
  await wait(LATENCY_MS.read);
  const flow = findFlow(flowId);
  const versions = store.extras.versions[flowId] ?? [
    { id: `${flowId}_v1`, number: 1, label: flow.status === "draft" ? "Draft" : "Live", note: "First version.", author: flow.owner, at: flow.updatedAt, published: flow.status !== "draft", changes: { added: flow.graph.nodes.length, changed: 0, removed: 0 } },
  ];
  return clone({ flow: summarize(flow), versions });
}

/** Restoring writes a new draft version on top; history is never rewritten. */
export async function restoreVersion(flowId, versionId) {
  await wait(LATENCY_MS.write);
  const flow = findFlow(flowId);
  const versions = (store.extras.versions[flowId] ??= []);
  const source = versions.find((version) => version.id === versionId);
  if (!source) throw notFound("Version", versionId);
  for (const version of versions) if (version.label === "Draft") version.label = "";
  const number = Math.max(0, ...versions.map((version) => version.number)) + 1;
  const restored = { id: nextId("ver"), number, label: "Draft", note: `Restored version ${source.number}.`, author: store.workspace.you, at: Date.now(), published: false, changes: { added: 0, changed: 1, removed: 0 } };
  versions.unshift(restored);
  flow.status = flow.status === "draft" ? "draft" : "changed";
  flow.updatedAt = restored.at;
  save();
  return clone(restored);
}
