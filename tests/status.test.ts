import { describe, expect, it } from "vitest";
import { lastRunView, nextRunLabel, resultView, runModeTag } from "../src/app/status";
import type { FlowSummary } from "../src/types/domain";

const flow = (patch: Partial<FlowSummary>): FlowSummary => ({
  id: "f",
  name: "F",
  folder: "Sales",
  status: "published",
  chain: [],
  trigger: { kind: "webhook" },
  lastRun: null,
  owner: { id: "u", name: "You", isYou: true },
  updatedAt: 0,
  ...patch,
});

describe("status views", () => {
  it("names the next run from the trigger, and never for a draft", () => {
    expect(nextRunLabel(flow({}))).toBe("On webhook");
    expect(nextRunLabel(flow({ trigger: { kind: "interval", unit: "hour" } }))).toBe("Every hour");
    expect(nextRunLabel(flow({ trigger: { kind: "weekly", weekday: 1, hour: 8, minute: 0 } }))).toBe("Mon 08:00");
    expect(nextRunLabel(flow({ status: "draft" }))).toBe("Draft: publish first");
  });

  it("describes the last run by its outcome", () => {
    expect(lastRunView(null)).toBeNull();
    expect(lastRunView({ status: "running", at: Date.now() })).toEqual({ tone: "run", label: "Running" });
    expect(lastRunView({ status: "succeeded", at: Date.now() - 2 * 60_000 })).toEqual({ tone: "ok", label: "2 min ago" });
    expect(lastRunView({ status: "failed", at: Date.now() - 26 * 3_600_000 })?.tone).toBe("err");
  });

  it("words attempt results", () => {
    expect(resultView({ kind: "failed", code: 503 })).toEqual({ tone: "err", label: "Failed, 503" });
    expect(resultView({ kind: "failed", code: 503 }, true).label).toBe("Failed, server answered 503");
    expect(resultView({ kind: "branch", branch: "yes" }).label).toBe("Took yes");
    expect(resultView({ kind: "disabled" }).tone).toBe("dis");
  });

  it("colours run modes", () => {
    expect(runModeTag("test")).toEqual({ label: "Test", color: "cyan" });
    expect(runModeTag("test", true).label).toBe("Test mode");
  });
});
