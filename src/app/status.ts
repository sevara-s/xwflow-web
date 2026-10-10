import { catalog } from "../content/catalog";
import type { AttemptResult, FlowStatus, FlowSummary, RunMode, RunStatus, StatusTone } from "../types/domain";
import { fill, formatAgo, formatDay, formatWeekly } from "./format";

const words = catalog.studio;

export interface StatusView {
  tone: StatusTone;
  label: string;
}

/** XWUITag variant plus an xwflow colour name for the tag tint. */
export interface TagView {
  label: string;
  color: "lime" | "cyan" | "violet" | "pink" | "orange" | "red" | "amber" | "plain" | "plan";
}

const flowTones: Record<FlowStatus, StatusTone> = { published: "ok", changed: "warn", draft: "idle" };
const runTones: Record<RunStatus, StatusTone> = { running: "run", succeeded: "ok", retried: "ok", failed: "err" };

export function flowStatusView(status: FlowStatus): StatusView {
  return { tone: flowTones[status], label: words.flowStatus[status] };
}

export function runStatusView(status: RunStatus): StatusView {
  return { tone: runTones[status], label: words.runStatus[status] };
}

export function lastRunView(lastRun: FlowSummary["lastRun"]): StatusView | null {
  if (!lastRun) return null;
  if (lastRun.status === "running") return { tone: "run", label: words.runStatus.running };
  if (lastRun.status === "failed") {
    return { tone: "err", label: fill(words.lastRun.failed, { when: formatDay(lastRun.at).toLocaleLowerCase() }) };
  }
  return { tone: "ok", label: formatAgo(lastRun.at) };
}

export function nextRunLabel(flow: FlowSummary): string {
  if (flow.status === "draft") return words.flows.nextRun.draft;
  const trigger = flow.trigger;
  if (trigger.kind === "webhook") return words.flows.nextRun.webhook;
  if (trigger.kind === "interval") return words.flows.nextRun[trigger.unit];
  return formatWeekly(trigger.weekday, trigger.hour, trigger.minute);
}

const modeColors: Record<RunMode, TagView["color"]> = { production: "lime", test: "cyan", retry: "orange", replay: "violet" };

export function runModeTag(mode: RunMode, long = false): TagView {
  return { label: long ? words.runModeLong[mode] : words.runMode[mode], color: modeColors[mode] };
}

export function resultView(result: AttemptResult, long = false): StatusView {
  switch (result.kind) {
    case "pinned":
      return { tone: "pin", label: words.result.pinned };
    case "received":
      return { tone: "ok", label: words.result.received };
    case "succeeded":
      return { tone: "ok", label: words.result.succeeded };
    case "failed":
      return { tone: "err", label: fill(long ? words.result.failedLong : words.result.failed, { code: result.code }) };
    case "branch":
      return { tone: "ok", label: fill(words.result.branch, { branch: result.branch }) };
    case "disabled":
      return { tone: "dis", label: words.result.disabled };
    case "notRun":
      return { tone: "idle", label: words.result.notRun };
  }
}
