/**
 * Admin and system sample data. Times are offsets from `now`, like the
 * studio data, so "as of 12 s ago" and "3 hours ago" stay true.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Succeeded and failed runs for each of the last 24 hours, peaking at midday. */
const runsByHour = [
  [60, 2], [48, 2], [40, 1], [36, 1], [34, 2], [42, 2], [56, 4], [92, 6], [130, 8], [160, 10], [178, 12], [190, 14],
  [196, 16], [184, 12], [170, 10], [158, 9], [140, 8], [120, 7], [104, 6], [96, 5], [88, 4], [76, 3], [66, 2], [30, 1],
].map(([succeeded, failed]) => ({ succeeded, failed }));

export function seedAdmin(now) {
  return {
    tenant: { id: "t_personal", name: "Personal workspace", plan: "core" },
    you: { role: "Builder" },
    overview: {
      kpis: [
        { id: "runs24h", value: 12480, asOf: now - 12 * SECOND, note: null },
        { id: "failed24h", value: 170, asOf: now - 12 * SECOND, note: null },
        { id: "overdue", value: 0, asOf: now - 5 * SECOND, note: null },
        { id: "queued", value: null, asOf: null, note: "noAdmission" },
      ],
      runsByHour,
      failing: [
        { flowId: "f_invoice_digest", flow: "Weekly invoice digest", tenant: "Personal workspace", failed: 96, cause: "Credential sign-in expired" },
        { flowId: "f_order_alert", flow: "Order alert", tenant: "Personal workspace", failed: 51, cause: "Server answered 503" },
        { flowId: "f_lead_intake", flow: "Lead intake", tenant: "Personal workspace", failed: 23, cause: "Timed out" },
      ],
    },
    services: [
      { id: "engine", label: "Engine", state: "ok", reach: true },
      { id: "api", label: "API", state: "ok", reach: true },
      { id: "identity", label: "Identity", state: "ok", reach: true },
      { id: "storage", label: "Storage", state: "err", reach: true, downSince: now - 3 * MINUTE, lastGood: now - 7 * MINUTE },
      { id: "workers", label: "Workers", state: "ok", reach: false },
      { id: "scheduler", label: "Scheduler", state: "warn", reach: false, heartbeatAgeS: 94 },
    ],
    checks: [
      { id: "storage", label: "Storage seam", state: "err", checkedAt: now - 8 * SECOND, summary: "unreachable", detail: { downMinutes: 3, lastGood: now - 7 * MINUTE } },
      { id: "scheduler", label: "Scheduler", state: "warn", checkedAt: now - 5 * SECOND, summary: "lateHeartbeat", detail: { heartbeatAgeS: 94 } },
      { id: "api", label: "API", state: "ok", checkedAt: now - 8 * SECOND, summary: "answering", detail: { basePath: "/xwflow/v1" } },
      { id: "workers", label: "Workers", state: "ok", checkedAt: now - 8 * SECOND, summary: "heartbeating", detail: { alive: 4, total: 4, inFlight: 2 } },
      { id: "queue", label: "Queue", state: "ok", checkedAt: now - 8 * SECOND, summary: "draining", detail: { waiting: 12, oldestS: 3 } },
      { id: "live", label: "Live updates", state: "ok", checkedAt: now - 8 * SECOND, summary: "connected", detail: { subscribers: 3 } },
    ],
    uptime: [
      { service: "API", days: Array.from({ length: 30 }, (_, index) => (index === 17 ? "warn" : "ok")) },
      { service: "Scheduler", days: Array.from({ length: 30 }, (_, index) => (index === 9 || index === 29 ? "warn" : "ok")) },
      { service: "Storage", days: Array.from({ length: 30 }, (_, index) => (index === 29 ? "err" : "ok")) },
    ],
    log: [
      { at: now - 3 * MINUTE + 22 * SECOND, source: "storage", tone: "err", message: "no answer, attempt 6" },
      { at: now - 3 * MINUTE + 1 * SECOND, source: "scheduler", tone: "warn", message: "heartbeat late: 94 s" },
      { at: now - 6 * MINUTE + 9 * SECOND, source: "storage", tone: "err", message: "last good answer" },
      { at: now - 10 * MINUTE, source: "worker-3", tone: "ok", message: "heartbeat ok" },
    ],
    audit: [
      { id: "e1", kind: "published", group: "trigger", title: "Flow published", object: { name: "Order alert", type: "flow" }, actor: { name: "You", class: "person" }, onBehalfOf: null, at: now - 12 * MINUTE },
      { id: "e2", kind: "edited", group: "ai", title: "Draft edited by the assistant", object: { name: "Order alert", type: "flow" }, actor: { name: "Assistant", class: "assistant" }, onBehalfOf: "You", at: now - 29 * MINUTE },
      { id: "e3", kind: "replaced", group: "integration", title: "Connection replaced", object: { name: "Finance mailbox", type: "connection" }, actor: { name: "Sam Rivers", class: "person" }, onBehalfOf: null, at: now - 3 * HOUR },
      { id: "e4", kind: "paused", group: "control", title: "Schedule paused", object: { name: "Weekly invoice digest", type: "schedule", note: "after 3 failed runs" }, actor: { name: "System", class: "system" }, onBehalfOf: null, at: now - 1 * DAY },
      { id: "e5", kind: "erased", group: "data", title: "Payload erased", object: { name: "12 runs matching one subject", type: "runs" }, actor: { name: "You", class: "person" }, onBehalfOf: null, at: now - 2 * DAY },
    ],
    auditRetentionDays: 30,
    branding: {
      productName: "Nova Flow",
      assistantName: "Nova",
      primary: "#ff4fa3",
      swatches: ["#c8ff3d", "#ff4fa3", "#2ee6ff", "#9b6bff", "#ff8a3d"],
      typefaces: ["Unbounded and Manrope", "Manrope only", "System font"],
      typeface: "Unbounded and Manrope",
      removeMarks: true,
      domain: "",
      background: "#0b0b16",
    },
    denied: { page: "Quotas", missingRole: "Operator", grantedBy: "Tenant admins" },
  };
}
