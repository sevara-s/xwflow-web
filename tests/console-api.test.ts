import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshApi() {
  vi.resetModules();
  return import("../src/api/dummy-api.js");
}

beforeEach(() => globalThis.sessionStorage?.clear());

describe("operator console API", () => {
  it("filters tenants, adds one, refuses a duplicate and suspending your own", async () => {
    const api = await freshApi();
    expect((await api.listTenants()).tenants).toHaveLength(4);
    expect((await api.listTenants({ plan: "commercial" })).tenants.map((tenant) => tenant.name)).toEqual(["Atlas Ops", "Nova Flow"]);
    expect((await api.listTenants({ q: "acme" })).tenants[0].status).toBe("suspended");
    const added = await api.addTenant({ name: "Blue Harbor", plan: "core", region: "eu-central" });
    expect(added.status).toBe("active");
    await expect(api.addTenant({ name: "blue harbor", plan: "core", region: "eu-central" })).rejects.toMatchObject({ code: "exists" });
    await expect(api.setTenantStatus("t_personal", "suspended")).rejects.toMatchObject({ code: "own_tenant" });
    expect((await api.setTenantStatus("t_acme", "active")).status).toBe("active");
    expect((await api.listAudit({ days: 1 })).events[0].title).toBe("Tenant resumed");
  });

  it("saves the credentials policy", async () => {
    const api = await freshApi();
    const { policy, findings } = await api.getCredentialPolicy();
    expect(policy.rotationDays).toBe(90);
    expect(findings.length).toBeGreaterThan(0);
    expect((await api.saveCredentialPolicy({ rotationDays: 30 })).rotationDays).toBe(30);
    expect((await api.getCredentialPolicy()).policy.rotationDays).toBe(30);
  });

  it("counts node use from the flows and refuses to disable a type a published flow uses", async () => {
    const api = await freshApi();
    const { nodes } = await api.listNodeRegistry();
    const webhook = nodes.find((node) => node.id === "webhook")!;
    expect(webhook.usedBy).toBeGreaterThan(0);
    await expect(api.setNodeEnabled("webhook", false)).rejects.toMatchObject({ code: "in_use" });
    expect(nodes.find((node) => node.id === "subFlow")?.enabled).toBe(false);
    expect((await api.setNodeEnabled("subFlow", true)).enabled).toBe(true);
    expect((await api.listNodeRegistry({ group: "trigger" })).nodes.every((node) => node.group === "trigger")).toBe(true);
  });

  it("imports an adapter's sample as a draft flow", async () => {
    const api = await freshApi();
    const before = (await api.listFlows({})).flows.length;
    const record = await api.runImport("zapier");
    expect(record.result).toBe("ok");
    const flows = (await api.listFlows({})).flows;
    expect(flows).toHaveLength(before + 1);
    expect(flows.find((flow) => flow.id === record.flowId)?.status).toBe("draft");
    expect((await api.listAdapters()).imports[0].id).toBe(record.id);
  });

  it("reports usage from the same runs the rail shows", async () => {
    const api = await freshApi();
    const [usage, workspace] = await Promise.all([api.getUsage(), api.getWorkspace()]);
    expect(usage.runs).toBe(workspace.usage.used);
    expect(usage.daily).toHaveLength(14);
  });

  it("keeps at least one AI model allowed", async () => {
    const api = await freshApi();
    const { policy } = await api.getAiGovernance();
    await expect(api.saveAiPolicy({ models: policy.models.map((model) => ({ ...model, enabled: false })) })).rejects.toMatchObject({ code: "no_model" });
    expect((await api.saveAiPolicy({ approval: "everyRun" })).approval).toBe("everyRun");
  });

  it("pauses schedules one by one and all at once", async () => {
    const api = await freshApi();
    expect((await api.setScheduleEnabled("f_sync_customers", false)).enabled).toBe(false);
    await api.pauseSchedules();
    expect((await api.listSchedules()).schedules.every((schedule) => !schedule.enabled)).toBe(true);
  });

  it("drains workers but never the last one, and resumes them", async () => {
    const api = await freshApi();
    await api.drainWorker("worker-1");
    await api.drainWorker("worker-2");
    await api.drainWorker("worker-3");
    await expect(api.drainWorker("worker-4")).rejects.toMatchObject({ code: "last_worker" });
    expect((await api.resumeWorker("worker-1")).state).toBe("idle");
    expect((await api.listWorkers()).workers.filter((worker) => worker.state === "draining")).toHaveLength(2);
  });

  it("lists every tenant's executions, with this tenant's own runs openable", async () => {
    const api = await freshApi();
    const { runs, tenants } = await api.listExecutions();
    expect(tenants).toContain("Atlas Ops");
    expect(runs.some((run) => run.own) && runs.some((run) => !run.own)).toBe(true);
    expect((await api.listExecutions({ tenant: "Nova Flow" })).runs.every((run) => run.tenant === "Nova Flow")).toBe(true);
  });

  it("validates config values and refuses read-only ones", async () => {
    const api = await freshApi();
    await expect(api.saveConfig({ maxConcurrentRuns: 0 })).rejects.toMatchObject({ code: "out_of_range" });
    await expect(api.saveConfig({ apiBasePath: "/x" })).rejects.toMatchObject({ code: "read_only" });
    const { entries } = await api.saveConfig({ maxConcurrentRuns: 40 });
    expect(entries.find((entry) => entry.id === "maxConcurrentRuns")).toMatchObject({ value: 40, source: "console" });
  });
});
