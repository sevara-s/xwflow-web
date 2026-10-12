/**
 * Dummy API: operator console: tenants, policies, registry, adapters, usage, AI, schedules, workers, executions, config.
 */
import { nodeTypes } from "../data/site.js";
import { clone, consoleError, logAudit, matches, nextId, notFound, read, save, store, write } from "../core.js";
import { findFlow, runSummary, settleRuns } from "../engine.js";
import { createFlow } from "./studio.js";

export async function listTenants(query = {}) {
  await read();
  const tenants = store.console.tenants
    .filter((tenant) => matches(tenant.name, query.q))
    .filter((tenant) => !query.plan || tenant.plan === query.plan)
    .filter((tenant) => !query.status || tenant.status === query.status);
  return clone({ tenants, total: store.console.tenants.length });
}

export async function addTenant({ name, plan, region }) {
  await write();
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
  await write();
  const tenant = store.console.tenants.find((item) => item.id === tenantId);
  if (!tenant) throw notFound("Tenant", tenantId);
  if (tenant.id === store.admin.tenant.id && status === "suspended") throw consoleError("own_tenant", "You cannot suspend the tenant you are signed in to.");
  tenant.status = status;
  logAudit("paused", "control", status === "suspended" ? "Tenant suspended" : "Tenant resumed", { name: tenant.name, type: "tenant" });
  save();
  return clone(tenant);
}

export async function getCredentialPolicy() {
  await read();
  return clone({ policy: store.console.credentialPolicy, findings: store.console.credentialFindings });
}

export async function saveCredentialPolicy(policy) {
  await write();
  store.console.credentialPolicy = { ...store.console.credentialPolicy, ...policy };
  logAudit("edited", "control", "Credentials policy changed", { name: "Credentials policy", type: "policy" });
  save();
  return clone(store.console.credentialPolicy);
}

/** Node types with how many flows use each, from the flows themselves. */
export async function listNodeRegistry(query = {}) {
  await read();
  const usedBy = (typeId) => store.flows.filter((flow) => flow.graph.nodes.some((node) => node.type === typeId)).length;
  const nodes = nodeTypes
    .map((type) => ({ id: type.id, label: type.label, group: type.group, summary: type.summary, version: store.console.nodeVersions[type.id] ?? "1.0", usedBy: usedBy(type.id), enabled: !store.console.disabledNodes.includes(type.id) }))
    .filter((node) => matches(`${node.label} ${node.summary}`, query.q))
    .filter((node) => !query.group || node.group === query.group);
  return clone({ nodes });
}

export async function setNodeEnabled(typeId, enabled) {
  await write();
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
  await read();
  return clone({ adapters: store.console.adapters, imports: [...store.console.imports].sort((a, b) => b.at - a.at) });
}

/** Import the adapter's sample export: one draft flow lands in the project. */
export async function runImport(adapterId) {
  await write(400);
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
  await read();
  const { used, included, periodEnds } = store.workspace.usage;
  return clone({ ...store.console.usage, runs: used, runsIncluded: included, periodEnds });
}

export async function getAiGovernance() {
  await read();
  const { calls, ...policy } = store.console.ai;
  return clone({ policy, calls: [...calls].sort((a, b) => b.at - a.at) });
}

export async function saveAiPolicy(patch) {
  await write();
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
  await read();
  const schedules = store.console.schedules.map((schedule) => {
    const flow = store.flows.find((item) => item.id === schedule.flowId);
    return { ...schedule, flowName: flow ? flow.name : schedule.flowId };
  });
  return clone({ schedules });
}

export async function setScheduleEnabled(flowId, enabled) {
  await write();
  const schedule = store.console.schedules.find((item) => item.flowId === flowId);
  if (!schedule) throw notFound("Schedule", flowId);
  schedule.enabled = enabled;
  logAudit("paused", "control", enabled ? "Schedule resumed" : "Schedule paused", { name: findFlow(flowId).name, type: "schedule" });
  save();
  return clone(schedule);
}

export async function listWorkers() {
  await read();
  return clone({ workers: store.console.workers });
}

export async function resumeWorker(workerId) {
  await write();
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
  await read();
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
  await read();
  return clone({ entries: store.console.config });
}

export async function saveConfig(values) {
  await write();
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
