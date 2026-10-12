/**
 * Dummy API: project areas: agents, tables, forms, variables, MCP servers.
 */
import { clone, findIn, invalid, matches, nextId, read, save, store, write } from "../core.js";

export async function listAgents(query = {}) {
  await read();
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
  await write();
  const agent = findIn(store.project.agents, "Agent", agentId);
  if (!["live", "paused", "draft"].includes(status)) throw invalid(`Unknown agent status ${status}.`);
  agent.status = status;
  if (status === "live") agent.lastActiveAt = Date.now();
  save();
  return clone(agent);
}

export async function createAgent({ name, description = "" }) {
  await write();
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
  await read();
  return clone(store.project.tables.map(({ records, ...table }) => ({ ...table, columnCount: table.columns.length })));
}

export async function getTable(tableId) {
  await read();
  return clone(findIn(store.project.tables, "Table", tableId));
}

export async function listForms() {
  await read();
  return clone(store.project.forms);
}

export async function setFormStatus(formId, status) {
  await write();
  const form = findIn(store.project.forms, "Form", formId);
  if (status === "live" && !form.flow) throw invalid(`${form.name} needs a flow before it can go live.`);
  form.status = status;
  form.updatedAt = Date.now();
  save();
  return clone(form);
}

/** Secret values never leave the store: the list carries a mask instead. */
export async function listVariables(query = {}) {
  await read();
  const scope = query.scope ?? "";
  return clone(
    store.project.variables
      .filter((variable) => !scope || variable.scope === scope || variable.scope === "all")
      .filter((variable) => matches(variable.key, query.q ?? ""))
      .map(({ value, ...variable }) => ({ ...variable, value: variable.secret ? null : value })),
  );
}

export async function addVariable({ key, value, secret = false, scope = "all" }) {
  await write();
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
  await write();
  const variable = findIn(store.project.variables, "Variable", variableId);
  if (variable.usedBy > 0) throw invalid(`${variable.key} is used by ${variable.usedBy} step(s). Remove it from them first.`);
  store.project.variables = store.project.variables.filter((item) => item.id !== variableId);
  save();
  return { deleted: variableId };
}

export async function listMcpServers() {
  await read();
  return clone(store.project.mcpServers);
}

/** Enable or disable a server; enabling reconnects (an errored server recovers). */
export async function setMcpServerEnabled(serverId, enabled) {
  await write();
  const server = findIn(store.project.mcpServers, "MCP server", serverId);
  server.status = enabled ? "connected" : "disabled";
  server.lastError = null;
  server.latencyMs = enabled ? 200 : null;
  save();
  return clone(server);
}

export async function addMcpServer({ name, url }) {
  await write();
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
