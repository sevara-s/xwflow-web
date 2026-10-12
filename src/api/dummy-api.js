/**
 * Local dummy API for xwflow. Pages reach data only through these async
 * functions. Each call waits a short, simulated network latency and returns
 * a copy, so the UI can never mutate the store by accident.
 *
 * The workspace is kept for the browser session (sessionStorage). Clearing
 * site data restores the sample workspace.
 */

import { nodeTypes } from "./data/site.js";
import { linearGraph } from "./data/studio.js";
import { templates } from "./data/workspace.js";
import { LATENCY_MS, clone, consoleError, logAudit, matches, nextId, notFound, save, store, wait } from "./core.js";
import { findFlow, runSummary, settleRuns, summarize } from "./engine.js";
import { createFlow } from "./modules/studio.js";
export * from "./modules/studio.js";
export * from "./modules/site.js";
export * from "./modules/admin.js";
export * from "./modules/views.js";

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


export async function listTenants(query = {}) {
  await wait(LATENCY_MS.read);
  const tenants = store.console.tenants
    .filter((tenant) => matches(tenant.name, query.q))
    .filter((tenant) => !query.plan || tenant.plan === query.plan)
    .filter((tenant) => !query.status || tenant.status === query.status);
  return clone({ tenants, total: store.console.tenants.length });
}

export async function addTenant({ name, plan, region }) {
  await wait(LATENCY_MS.write);
  const trimmed = (name ?? "").trim();
  if (!trimmed) throw consoleError("invalid", "Give the tenant a name.");
  if (store.console.tenants.some((tenant) => tenant.name.toLowerCase() === trimmed.toLowerCase())) throw consoleError("exists", `${trimmed} already exists.`);
  const tenant = { id: nextId("t"), name: trimmed, plan, region, members: 1, flows: 0, runs30d: 0, status: "active", createdAt: Date.now() };
  store.console.tenants.push(tenant);
  logAudit("published", "trigger", "Tenant created", { name: trimmed, type: "tenant" });
  save();
  return clone(tenant);
}

export async function setTenantStatus(tenantId, status) {
  await wait(LATENCY_MS.write);
  const tenant = store.console.tenants.find((item) => item.id === tenantId);
  if (!tenant) throw notFound("Tenant", tenantId);
  if (tenant.id === store.admin.tenant.id && status === "suspended") throw consoleError("own_tenant", "You cannot suspend the tenant you are signed in to.");
  tenant.status = status;
  logAudit("paused", "control", status === "suspended" ? "Tenant suspended" : "Tenant resumed", { name: tenant.name, type: "tenant" });
  save();
  return clone(tenant);
}

export async function getCredentialPolicy() {
  await wait(LATENCY_MS.read);
  return clone({ policy: store.console.credentialPolicy, findings: store.console.credentialFindings });
}

export async function saveCredentialPolicy(policy) {
  await wait(LATENCY_MS.write);
  store.console.credentialPolicy = { ...store.console.credentialPolicy, ...policy };
  logAudit("edited", "control", "Credentials policy changed", { name: "Credentials policy", type: "policy" });
  save();
  return clone(store.console.credentialPolicy);
}

/** Node types with how many flows use each, from the flows themselves. */
export async function listNodeRegistry(query = {}) {
  await wait(LATENCY_MS.read);
  const usedBy = (typeId) => store.flows.filter((flow) => flow.graph.nodes.some((node) => node.type === typeId)).length;
  const nodes = nodeTypes
    .map((type) => ({ id: type.id, label: type.label, group: type.group, summary: type.summary, version: store.console.nodeVersions[type.id] ?? "1.0", usedBy: usedBy(type.id), enabled: !store.console.disabledNodes.includes(type.id) }))
    .filter((node) => matches(`${node.label} ${node.summary}`, query.q))
    .filter((node) => !query.group || node.group === query.group);
  return clone({ nodes });
}

export async function setNodeEnabled(typeId, enabled) {
  await wait(LATENCY_MS.write);
  const type = nodeTypes.find((item) => item.id === typeId);
  if (!type) throw notFound("Node type", typeId);
  const published = store.flows.filter((flow) => flow.status !== "draft" && flow.graph.nodes.some((node) => node.type === typeId)).length;
  if (!enabled && published) throw consoleError("in_use", `${type.label} is used by ${published} published ${published === 1 ? "flow" : "flows"}.`);
  const disabled = new Set(store.console.disabledNodes);
  if (enabled) disabled.delete(typeId);
  else disabled.add(typeId);
  store.console.disabledNodes = [...disabled];
  logAudit("edited", "control", enabled ? "Node type enabled" : "Node type disabled", { name: type.label, type: "node" });
  save();
  return { id: typeId, enabled };
}

export async function listAdapters() {
  await wait(LATENCY_MS.read);
  return clone({ adapters: store.console.adapters, imports: [...store.console.imports].sort((a, b) => b.at - a.at) });
}

/** Import the adapter's sample export: one draft flow lands in the project. */
export async function runImport(adapterId) {
  await wait(LATENCY_MS.write + 400);
  const adapter = store.console.adapters.find((item) => item.id === adapterId);
  if (!adapter) throw notFound("Adapter", adapterId);
  const flow = await createFlow({ name: `Imported from ${adapter.name}`, folder: store.workspace.project.name });
  const record = { id: nextId("i"), adapter: adapterId, file: `${adapterId}-sample.json`, flows: 1, result: adapter.status === "preview" ? "partial" : "ok", at: Date.now(), note: adapter.status === "preview" ? "Preview adapter: review every step before publishing" : null, flowId: flow.id };
  store.console.imports.push(record);
  logAudit("published", "integration", "Flow imported", { name: flow.name, type: "flow" });
  save();
  return clone(record);
}

export async function getUsage() {
  await wait(LATENCY_MS.read);
  const { used, included, periodEnds } = store.workspace.usage;
  return clone({ ...store.console.usage, runs: used, runsIncluded: included, periodEnds });
}

export async function getAiGovernance() {
  await wait(LATENCY_MS.read);
  const { calls, ...policy } = store.console.ai;
  return clone({ policy, calls: [...calls].sort((a, b) => b.at - a.at) });
}

export async function saveAiPolicy(patch) {
  await wait(LATENCY_MS.write);
  const ai = store.console.ai;
  if (patch.models) {
    const enabled = patch.models.filter((model) => model.enabled).length;
    if (!enabled) throw consoleError("no_model", "Keep at least one model allowed, or turn AI steps off.");
    ai.models = patch.models;
  }
  if (patch.redactPersonalData !== undefined) ai.redactPersonalData = patch.redactPersonalData;
  if (patch.approval) ai.approval = patch.approval;
  logAudit("edited", "ai", "AI policy changed", { name: "AI governance", type: "policy" });
  save();
  const { calls, ...policy } = ai;
  return clone(policy);
}

export async function listSchedules() {
  await wait(LATENCY_MS.read);
  const schedules = store.console.schedules.map((schedule) => {
    const flow = store.flows.find((item) => item.id === schedule.flowId);
    return { ...schedule, flowName: flow ? flow.name : schedule.flowId };
  });
  return clone({ schedules });
}

export async function setScheduleEnabled(flowId, enabled) {
  await wait(LATENCY_MS.write);
  const schedule = store.console.schedules.find((item) => item.flowId === flowId);
  if (!schedule) throw notFound("Schedule", flowId);
  schedule.enabled = enabled;
  logAudit("paused", "control", enabled ? "Schedule resumed" : "Schedule paused", { name: findFlow(flowId).name, type: "schedule" });
  save();
  return clone(schedule);
}

export async function listWorkers() {
  await wait(LATENCY_MS.read);
  return clone({ workers: store.console.workers });
}

export async function resumeWorker(workerId) {
  await wait(LATENCY_MS.write);
  const worker = store.console.workers.find((item) => item.id === workerId);
  if (!worker) throw notFound("Worker", workerId);
  worker.state = "idle";
  worker.heartbeatAt = Date.now();
  const workers = store.admin.checks.find((item) => item.id === "workers");
  if (workers) workers.detail.alive = store.console.workers.filter((item) => item.state !== "draining").length;
  logAudit("published", "control", "Worker resumed", { name: worker.id, type: "worker" });
  save();
  return clone(worker);
}

/** Every tenant's runs: this tenant's real runs, then the others' sample runs. */
export async function listExecutions(query = {}) {
  await wait(LATENCY_MS.read);
  settleRuns();
  const own = store.runs.map((run) => ({ ...runSummary(run), tenant: store.admin.tenant.name, own: true }));
  const others = store.console.otherRuns.map((run) => ({ ...run, own: false }));
  const runs = [...own, ...others]
    .filter((run) => matches(`${run.flowName} ${run.id} ${run.tenant}`, query.q))
    .filter((run) => !query.tenant || run.tenant === query.tenant)
    .filter((run) => !query.status || run.status === query.status)
    .sort((a, b) => b.startedAt - a.startedAt);
  return clone({ runs, tenants: [store.admin.tenant.name, ...new Set(others.map((run) => run.tenant))] });
}

export async function getConfig() {
  await wait(LATENCY_MS.read);
  return clone({ entries: store.console.config });
}

export async function saveConfig(values) {
  await wait(LATENCY_MS.write);
  for (const [id, raw] of Object.entries(values)) {
    const entry = store.console.config.find((item) => item.id === id);
    if (!entry || !entry.editable) throw consoleError("read_only", `${id} cannot be changed here.`);
    const value = Number(raw);
    if (!Number.isInteger(value) || value < entry.min || value > entry.max) {
      const error = consoleError("out_of_range", `${id} must be a whole number from ${entry.min} to ${entry.max}.`);
      error.field = { id, min: entry.min, max: entry.max };
      throw error;
    }
  }
  for (const [id, raw] of Object.entries(values)) {
    const entry = store.console.config.find((item) => item.id === id);
    entry.value = Number(raw);
    entry.source = "console";
  }
  logAudit("edited", "control", "Configuration changed", { name: `${Object.keys(values).length} settings`, type: "config" });
  save();
  return clone({ entries: store.console.config });
}
