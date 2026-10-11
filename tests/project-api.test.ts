import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshApi() {
  vi.resetModules();
  return import("../src/api/dummy-api.js");
}

beforeEach(() => sessionStorage.clear());

describe("project areas API", () => {
  it("lists agents with workspace counts, and filters by text and status", async () => {
    const api = await freshApi();
    const all = await api.listAgents();
    expect(all.agents).toHaveLength(4);
    expect(all.counts).toEqual({ live: 2, conversations7d: 470, handoffs7d: 119 });
    expect((await api.listAgents({ q: "invoice" })).agents.map((agent) => agent.id)).toEqual(["ag_finance"]);
    expect((await api.listAgents({ status: "draft" })).agents.map((agent) => agent.id)).toEqual(["ag_onboarding"]);
  });

  it("pauses an agent and creates a new one as a draft", async () => {
    const api = await freshApi();
    expect((await api.setAgentStatus("ag_support", "paused")).status).toBe("paused");
    expect((await api.listAgents()).counts.live).toBe(1);
    const agent = await api.createAgent({ name: "  Returns helper " });
    expect(agent).toMatchObject({ name: "Returns helper", status: "draft", tools: [] });
    expect((await api.listAgents()).agents[0].id).toBe(agent.id);
    await expect(api.createAgent({ name: " " })).rejects.toMatchObject({ code: "invalid" });
  });

  it("lists tables without their records and opens one with them", async () => {
    const api = await freshApi();
    const tables = await api.listTables();
    expect(tables.map((table) => table.id)).toEqual(["t_orders", "t_customers", "t_ledger"]);
    expect(tables[0]).not.toHaveProperty("records");
    expect(tables[0].columnCount).toBe(5);
    expect((await api.getTable("t_orders")).records).toHaveLength(6);
    await expect(api.getTable("t_missing")).rejects.toMatchObject({ code: "not_found" });
  });

  it("will not put a form without a flow live", async () => {
    const api = await freshApi();
    await expect(api.setFormStatus("fm_feedback", "live")).rejects.toMatchObject({ code: "invalid" });
    expect((await api.setFormStatus("fm_refund", "draft")).status).toBe("draft");
  });

  it("never returns a secret value and filters variables by environment", async () => {
    const api = await freshApi();
    const production = await api.listVariables({ scope: "production" });
    expect(production.every((variable) => variable.scope !== "test")).toBe(true);
    expect(production.find((variable) => variable.key === "WEBHOOK_SIGNING_KEY")?.value).toBeNull();
    expect(production.find((variable) => variable.key === "CUSTOMER_API_BASE")?.value).toBe("https://api.example.com");
    expect(JSON.stringify(await api.listVariables())).not.toContain("whsec_");
  });

  it("adds variables with a clean name, refuses duplicates and in-use deletes", async () => {
    const api = await freshApi();
    const added = await api.addVariable({ key: "slack token", value: "xoxb-1", secret: true, scope: "test" });
    expect(added).toMatchObject({ key: "SLACK_TOKEN", value: null, secret: true });
    await expect(api.addVariable({ key: "SLACK_TOKEN", value: "x", scope: "test" })).rejects.toMatchObject({ code: "invalid" });
    await expect(api.deleteVariable("v_signing")).rejects.toMatchObject({ code: "invalid" });
    expect(await api.deleteVariable(added.id)).toEqual({ deleted: added.id });
  });

  it("reconnects an MCP server that failed and checks new addresses", async () => {
    const api = await freshApi();
    const fixed = await api.setMcpServerEnabled("mcp_warehouse", true);
    expect(fixed).toMatchObject({ status: "connected", lastError: null });
    expect((await api.setMcpServerEnabled("mcp_files", false)).status).toBe("disabled");
    await expect(api.addMcpServer({ name: "Docs", url: "ftp://docs" })).rejects.toMatchObject({ code: "invalid" });
    expect((await api.addMcpServer({ name: "Docs", url: "stdio://docs-mcp" })).transport).toBe("stdio");
  });

  it("adds the project data to a session saved before it existed", async () => {
    let api = await freshApi();
    await api.listFlows();
    await api.createAgent({ name: "Force a save" });
    const key = Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index)).find((name) => name?.startsWith("xwflow.dummy"))!;
    const stored = JSON.parse(sessionStorage.getItem(key)!);
    delete stored.project;
    sessionStorage.setItem(key, JSON.stringify(stored));
    api = await freshApi();
    expect((await api.listTables()).length).toBe(3);
  });
});
