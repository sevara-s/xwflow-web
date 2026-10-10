import { describe, expect, it, vi } from "vitest";

async function freshApi() {
  vi.resetModules();
  return import("../src/api/dummy-api.js");
}

describe("website API", () => {
  it("serves the landing page from the same registry and sample flow as the studio", async () => {
    const api = await freshApi();
    const landing = await api.getLanding();
    const types = await api.listNodeTypes();
    expect(landing.stats.connectors).toBe(types.total);
    expect(landing.marquee).toHaveLength(types.total);
    expect(landing.flow.id).toBe("f_order_alert");
    expect(landing.receipt?.attempts.length).toBeGreaterThan(0);
  });

  it("builds the studio palette from the integrations registry", async () => {
    const api = await freshApi();
    const flow = await api.getFlow("f_order_alert");
    const types = await api.listNodeTypes();
    const paletteIds = flow.palette.flatMap((group) => group.items.map((item) => item.id)).sort();
    expect(paletteIds).toEqual(types.items.map((item) => item.id).sort());
  });

  it("filters integrations by group and words", async () => {
    const api = await freshApi();
    expect((await api.listNodeTypes({ group: "trigger" })).items.every((item) => item.group === "trigger")).toBe(true);
    expect((await api.listNodeTypes({ q: "cron" })).items.map((item) => item.id)).toEqual(["schedule"]);
  });

  it("returns the notation gallery with the flow every thumbnail draws", async () => {
    const api = await freshApi();
    const gallery = await api.getNotations();
    expect(gallery.total).toBe(24);
    expect(gallery.sample.steps[0].group).toBe("trigger");
    expect((await api.getNotations({ family: "software" })).items.every((item) => item.family === "software")).toBe(true);
  });

  it("validates the quote request", async () => {
    const api = await freshApi();
    await expect(api.requestQuote({ email: "not-an-email", need: "x" })).rejects.toMatchObject({ code: "invalid_email" });
    await expect(api.requestQuote({ email: "a@b.co", need: " " })).rejects.toMatchObject({ code: "missing_need" });
    expect((await api.requestQuote({ email: "a@b.co", need: "Order alerts" })).reference).toMatch(/^Q-/);
  });
});
