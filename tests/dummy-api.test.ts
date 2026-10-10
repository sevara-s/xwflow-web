import { beforeEach, describe, expect, it, vi } from "vitest";

/** The API keeps module state, so each test loads a fresh copy. */
async function freshApi() {
  vi.resetModules();
  return import("../src/api/dummy-api.js");
}

describe("dummy API", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("lists flows with derived counts, chains and last runs", async () => {
    const api = await freshApi();
    const list = await api.listFlows();
    expect(list.flows).toHaveLength(5);
    expect(list.counts).toMatchObject({ published: 3, running: 1, drafts: 1 });
    const order = list.flows.find((item) => item.id === "f_order_alert");
    expect(order?.chain[0]).toBe("trigger");
    expect(order?.lastRun?.status).toBe("retried");
    expect(list.folders).toEqual(["Finance", "Operations", "Sales"]);
  });

  it("filters flows by text, status and folder", async () => {
    const api = await freshApi();
    expect((await api.listFlows({ q: "invoice" })).flows.map((item) => item.id)).toEqual(["f_invoice_digest"]);
    expect((await api.listFlows({ status: "draft" })).flows).toHaveLength(1);
    expect((await api.listFlows({ folder: "Sales" })).flows).toHaveLength(2);
  });

  it("returns the recorded receipt with its problem and recovery", async () => {
    const api = await freshApi();
    const run = await api.getRun("r_7f39");
    expect(run.recordedSteps).toBe(3);
    expect(run.stepCount).toBe(5);
    expect(run.problem).toMatchObject({ step: "Look up customer", code: 503, recovered: true });
    expect(run.attempts.every((item) => item.group)).toBe(true);
  });

  it("plays a new test run to completion", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "Date"] });
    const api = await freshApi();
    const pending = api.startRun("f_order_alert", "test");
    await vi.advanceTimersByTimeAsync(500);
    const started = await pending;
    expect(started.status).toBe("running");
    await vi.advanceTimersByTimeAsync(10_000);
    const reading = api.getRun(started.id);
    await vi.advanceTimersByTimeAsync(500);
    const done = await reading;
    expect(done.status).toBe("succeeded");
    expect(done.attempts.some((item) => item.result.kind === "disabled")).toBe(true);
  });

  it("marks a published flow as changed when a step is edited, and publishes it again", async () => {
    const api = await freshApi();
    await api.updateStep("f_order_alert", "n_lookup", { fields: { method: "POST" } });
    expect((await api.getFlow("f_order_alert")).flow.status).toBe("changed");
    expect((await api.publishFlow("f_order_alert")).status).toBe("published");
  });

  it("reconnects a broken connection", async () => {
    const api = await freshApi();
    const fixed = await api.reconnectConnection("c_finance_mailbox");
    expect(fixed.health).toBe("healthy");
    expect((await api.listConnections({ health: "broken" })).length).toBe(0);
  });

  it("drafts a flow from a request by its keywords", async () => {
    const api = await freshApi();
    const draft = await api.draftFlow("Send me a weekly email report");
    expect(draft.title).toBe("Send a weekly digest");
    expect(draft.graph.nodes[0].group).toBe("trigger");
  });

  it("rejects unknown ids with a not_found code", async () => {
    const api = await freshApi();
    await expect(api.getRun("r_missing")).rejects.toMatchObject({ code: "not_found" });
  });
});
