import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshApi() {
  vi.resetModules();
  return import("../src/api/dummy-api.js");
}

beforeEach(() => sessionStorage.clear());

describe("workspace pages API", () => {
  it("puts failures before warnings in the overview and counts today", async () => {
    const api = await freshApi();
    const overview = await api.getOverview();
    expect(overview.today).toEqual({ runs: 69, failed: 1, running: 1 });
    expect(overview.attention.length).toBeGreaterThan(0);
    const firstWarning = overview.attention.findIndex((item) => item.tone === "warning");
    expect(overview.attention.slice(firstWarning).every((item) => item.tone === "warning")).toBe(true);
    expect(overview.attention.map((item) => item.kind)).toEqual(expect.arrayContaining(["run", "connection", "mcp", "chat", "agent"]));
    expect(overview.recent).toHaveLength(5);
    expect(overview.week).toHaveLength(7);
  });

  it("filters templates and turns one into a draft flow", async () => {
    const api = await freshApi();
    const sales = await api.listTemplates({ category: "Sales" });
    expect(sales.templates.map((template) => template.id)).toEqual(["tpl_order_alert", "tpl_lead_score"]);
    expect(sales.categories).toContain("Operations");
    expect((await api.listTemplates({ q: "spreadsheet" })).templates.map((template) => template.id)).toEqual(["tpl_sheet_sync"]);
    const flow = await api.useTemplate("tpl_invoice_digest");
    expect(flow).toMatchObject({ name: "Weekly invoice digest", status: "draft", folder: "Finance" });
    expect((await api.getFlow(flow.id)).graph.nodes.map((node) => node.name)).toEqual(["Every Monday", "Fetch open invoices", "Write the digest", "Email finance"]);
    await expect(api.useTemplate("tpl_nope")).rejects.toMatchObject({ code: "not_found" });
  });

  it("sums insights over 7 or 14 days", async () => {
    const api = await freshApi();
    const two = await api.getInsights();
    const one = await api.getInsights({ days: 7 });
    expect(two.days).toHaveLength(14);
    expect(one.days).toHaveLength(7);
    expect(two.totals.runs).toBe(1491);
    expect(two.totals.failed).toBe(53);
    expect(two.totals.successRate).toBeCloseTo(1438 / 1491);
    expect(two.topFlows[0]).toMatchObject({ flowId: "f_order_alert", runs: 507 });
    expect(two.totals.minutesSaved).toBe(two.topFlows.reduce((sum, flow) => sum + flow.minutesSaved, 0));
  });

  it("guards the owner and member emails", async () => {
    const api = await freshApi();
    await expect(api.setMemberRole("u_you", "viewer")).rejects.toMatchObject({ code: "invalid" });
    await expect(api.removeMember("u_you")).rejects.toMatchObject({ code: "invalid" });
    await expect(api.inviteMember({ email: "not-an-email" })).rejects.toMatchObject({ code: "invalid" });
    await expect(api.inviteMember({ email: "SAM@example.com" })).rejects.toMatchObject({ code: "invalid" });
    const invited = await api.inviteMember({ email: "kim@example.com", role: "viewer" });
    expect(invited).toMatchObject({ email: "kim@example.com", role: "viewer", invited: true });
    expect((await api.setMemberRole("u_sam", "viewer")).role).toBe("viewer");
    expect(await api.removeMember("u_ana")).toEqual({ removed: "u_ana" });
  });

  it("renames the workspace everywhere and limits retention", async () => {
    const api = await freshApi();
    await api.saveGeneral({ name: "  Acme ops " });
    expect((await api.getWorkspace()).project.name).toBe("Acme ops");
    await expect(api.saveGeneral({ retentionDays: 12 })).rejects.toMatchObject({ code: "invalid" });
    await expect(api.saveGeneral({ name: " " })).rejects.toMatchObject({ code: "invalid" });
  });

  it("shows an API token once and only its prefix afterwards", async () => {
    const api = await freshApi();
    const { key, token } = await api.createApiKey({ name: "Zapier bridge" });
    expect(token.startsWith(key.prefix)).toBe(true);
    expect(token.length).toBeGreaterThan(key.prefix.length);
    expect(JSON.stringify(await api.getSettings())).not.toContain(token);
    expect(await api.revokeApiKey(key.id)).toEqual({ revoked: key.id });
    expect((await api.setNotification("assistantDone", true)).assistantDone).toBe(true);
    await expect(api.setNotification("nope" as never, true)).rejects.toMatchObject({ code: "invalid" });
  });

  it("restores a version as a new draft on top of the history", async () => {
    const api = await freshApi();
    const before = await api.listVersions("f_order_alert");
    expect(before.versions[0]).toMatchObject({ number: 6, label: "Draft" });
    const restored = await api.restoreVersion("f_order_alert", "ver_4");
    expect(restored).toMatchObject({ number: 7, label: "Draft", note: "Restored version 4." });
    const after = await api.listVersions("f_order_alert");
    expect(after.versions.map((version) => version.number)).toEqual([7, 6, 5, 4, 3, 2, 1]);
    expect(after.versions.filter((version) => version.label === "Draft")).toHaveLength(1);
    expect(after.flow.status).toBe("changed");
    expect((await api.listVersions("f_refund")).versions).toHaveLength(1);
  });
});
