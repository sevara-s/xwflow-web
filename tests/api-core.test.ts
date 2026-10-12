import { beforeEach, describe, expect, it, vi } from "vitest";

/** A fresh API and its core, sharing one store. */
async function fresh() {
  vi.resetModules();
  const core = await import("../src/api/core.js");
  const api = await import("../src/api/dummy-api.js");
  return { core, api };
}

beforeEach(() => globalThis.sessionStorage?.clear());

describe("dummy API core", () => {
  it("reads latency and failure settings from the address", async () => {
    const { core } = await fresh();
    expect(core.settingsFromQuery("?api-latency=slow&api-failures=0.25")).toEqual({ readMs: 600, writeMs: 1200, failureRate: 0.25 });
    expect(core.settingsFromQuery("?api-latency=none")).toEqual({ readMs: 0, writeMs: 0 });
    expect(core.settingsFromQuery("?api-latency=warp&api-failures=7")).toEqual({});
  });

  it("starts quick and reliable", async () => {
    const { core } = await fresh();
    expect(core.configureApi()).toEqual({ readMs: 15, writeMs: 40, failureRate: 0 });
  });

  it("fails writes at the configured rate before changing anything, and keeps reads working", async () => {
    const { core, api } = await fresh();
    core.configureApi({ readMs: 0, writeMs: 0, failureRate: 1 });
    const before = (await api.listTenants()).tenants.length;
    await expect(api.addTenant({ name: "Blue Harbor", plan: "core", region: "eu-central" })).rejects.toMatchObject({ code: "unavailable" });
    expect((await api.listTenants()).tenants).toHaveLength(before);
    core.configureApi({ failureRate: 0 });
    expect((await api.addTenant({ name: "Blue Harbor", plan: "core", region: "eu-central" })).name).toBe("Blue Harbor");
  });
});
