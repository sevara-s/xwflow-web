/**
 * Dummy API: workspace pages: overview, templates, insights, settings, versions.
 */
import { linearGraph } from "../data/studio.js";
import { templates } from "../data/workspace.js";
import { LATENCY_MS, clone, findIn, invalid, matches, nextId, notFound, save, store, wait } from "../core.js";
import { findFlow, settleRuns, summarize } from "../engine.js";

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
