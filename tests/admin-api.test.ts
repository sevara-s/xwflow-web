import { describe, expect, it, vi } from "vitest";

async function freshApi() {
  vi.resetModules();
  return import("../src/api/dummy-api.js");
}

describe("admin API", () => {
  it("reports the worst service state for the rail", async () => {
    const api = await freshApi();
    expect((await api.getAdminContext()).health).toBe("err");
  });

  it("refuses to save a brand kit on the Core plan", async () => {
    const api = await freshApi();
    await expect(api.saveBranding({ productName: "Acme" })).rejects.toMatchObject({ code: "requires_commercial" });
    expect((await api.getBranding()).productName).toBe("Nova Flow");
  });

  it("filters the audit log by actor class and by date range", async () => {
    const api = await freshApi();
    const all = await api.listAudit({ days: 30 });
    expect(all.events.map((event) => event.at)).toEqual([...all.events.map((event) => event.at)].sort((a, b) => b - a));
    expect((await api.listAudit({ actorClass: "assistant", days: 30 })).events.every((event) => event.actor.class === "assistant")).toBe(true);
    expect((await api.listAudit({ days: 1 })).events.length).toBeLessThan(all.events.length);
  });

  it("recovers storage on the next health check", async () => {
    const api = await freshApi();
    expect((await api.getHealth()).checks.filter((check) => check.state !== "ok")).toHaveLength(2);
    const after = await api.recheckHealth();
    expect(after.checks.filter((check) => check.state !== "ok").map((check) => check.id)).toEqual(["scheduler"]);
    expect((await api.getAdminContext()).health).toBe("warn");
  });

  it("pauses scheduled flows and records it in the audit log", async () => {
    const api = await freshApi();
    const result = await api.pauseSchedules();
    expect(result.paused).toBe(2);
    expect((await api.listAudit({ days: 1 })).events[0].title).toBe("All schedules paused");
  });

  it("acknowledges an access request with a reference", async () => {
    const api = await freshApi();
    const denial = await api.getAccessDenial();
    expect(denial.missingRole).toBe("Operator");
    expect((await api.requestAccess(denial.missingRole)).reference).toMatch(/^AR-/);
  });
});
