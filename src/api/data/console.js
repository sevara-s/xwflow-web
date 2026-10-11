/**
 * Sample data for the operator console: the admin pages (tenants,
 * credentials policy, node registry, adapters, usage, AI governance) and the
 * system pages (schedules, workers, all executions, config). Times are
 * offsets from `now`, like the rest of the sample data.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function seedConsole(now) {
  return {
    tenants: [
      { id: "t_personal", name: "Personal workspace", plan: "core", region: "eu-central", members: 3, flows: 5, runs30d: 12480, status: "active", createdAt: now - 120 * DAY },
      { id: "t_atlas", name: "Atlas Ops", plan: "commercial", region: "eu-central", members: 18, flows: 42, runs30d: 318200, status: "active", createdAt: now - 300 * DAY },
      { id: "t_nova", name: "Nova Flow", plan: "commercial", region: "me-central", members: 9, flows: 17, runs30d: 96400, status: "active", createdAt: now - 210 * DAY },
      { id: "t_acme", name: "Acme Auto", plan: "core", region: "us-east", members: 4, flows: 6, runs30d: 2100, status: "suspended", createdAt: now - 45 * DAY },
    ],
    credentialPolicy: { preferOAuth: true, rotationDays: 90, blockPersonalInPublished: true, requireOwner: true },
    credentialFindings: [
      { connection: "Customer API", issue: "rotation", ageDays: 124 },
      { connection: "Finance mailbox", issue: "expired", ageDays: 0 },
      { connection: "Sales chat workspace", issue: "personal", ageDays: 0 },
    ],
    disabledNodes: ["subFlow"],
    nodeVersions: { webhook: "2.1", schedule: "2.0", http: "3.4", code: "1.8", aiCondition: "0.9" },
    adapters: [
      { id: "zapier", name: "Zapier", format: "Zap export (.json)", status: "available" },
      { id: "n8n", name: "n8n", format: "Workflow export (.json)", status: "available" },
      { id: "make", name: "Make", format: "Scenario blueprint (.json)", status: "available" },
      { id: "powerAutomate", name: "Power Automate", format: "Flow package (.zip)", status: "preview" },
    ],
    imports: [
      { id: "i_1", adapter: "zapier", file: "new-order-to-slack.json", flows: 1, result: "ok", at: now - 2 * DAY, note: null },
      { id: "i_2", adapter: "n8n", file: "crm-sync.json", flows: 2, result: "partial", at: now - 6 * DAY, note: "1 step had no xwflow match and was left as a note" },
    ],
    usage: {
      steps: 2914,
      aiCalls: 126,
      storageGb: 1.2,
      storageIncludedGb: 5,
      daily: [22, 18, 31, 27, 35, 12, 9, 28, 33, 41, 30, 26, 38, 30].map((runs, index) => ({ runs, failed: [1, 0, 2, 1, 3, 0, 0, 1, 2, 4, 1, 0, 2, 1][index] })),
      topFlows: [
        { flow: "Sync customers to the sheet", runs: 168 },
        { flow: "Order alert", runs: 121 },
        { flow: "Lead intake", runs: 64 },
        { flow: "Weekly invoice digest", runs: 27 },
      ],
    },
    ai: {
      models: [
        { id: "claude", name: "Claude", provider: "Anthropic", enabled: true },
        { id: "gpt", name: "GPT", provider: "OpenAI", enabled: false },
        { id: "local", name: "Llama, self-hosted", provider: "Your servers", enabled: true },
      ],
      redactPersonalData: true,
      approval: "publish",
      calls: [
        { at: now - 4 * MINUTE, flow: "Order alert", step: "Over 500?", model: "claude", tokens: 412, decision: "allowed", reason: null },
        { at: now - 38 * MINUTE, flow: "Lead intake", step: "Score the lead", model: "claude", tokens: 1210, decision: "redacted", reason: "2 email addresses removed" },
        { at: now - 2 * HOUR, flow: "Lead intake", step: "Score the lead", model: "gpt", tokens: 0, decision: "blocked", reason: "Model not allowed" },
      ],
    },
    schedules: [
      { flowId: "f_invoice_digest", cadence: "weekly", nextAt: now + 3 * DAY, lastAt: now - 4 * DAY, lastStatus: "failed", enabled: true },
      { flowId: "f_sync_customers", cadence: "hourly", nextAt: now + 23 * MINUTE, lastAt: now - 37 * MINUTE, lastStatus: "succeeded", enabled: true },
    ],
    workers: [
      { id: "worker-1", region: "eu-central", state: "busy", inFlight: 1, cpu: 46, version: "1.12.0", heartbeatAt: now - 4000 },
      { id: "worker-2", region: "eu-central", state: "busy", inFlight: 1, cpu: 38, version: "1.12.0", heartbeatAt: now - 6000 },
      { id: "worker-3", region: "eu-central", state: "idle", inFlight: 0, cpu: 4, version: "1.12.0", heartbeatAt: now - 3000 },
      { id: "worker-4", region: "me-central", state: "idle", inFlight: 0, cpu: 3, version: "1.11.2", heartbeatAt: now - 9000 },
    ],
    otherRuns: [
      { id: "x_a1", tenant: "Atlas Ops", flowName: "Ticket triage", status: "succeeded", mode: "production", startedAt: now - 2 * MINUTE, durationMs: 1840 },
      { id: "x_a2", tenant: "Atlas Ops", flowName: "Invoice approval", status: "failed", mode: "production", startedAt: now - 9 * MINUTE, durationMs: 30000 },
      { id: "x_n1", tenant: "Nova Flow", flowName: "Daily KPIs to chat", status: "succeeded", mode: "production", startedAt: now - 25 * MINUTE, durationMs: 4210 },
      { id: "x_n2", tenant: "Nova Flow", flowName: "New signup welcome", status: "retried", mode: "production", startedAt: now - 70 * MINUTE, durationMs: 2600 },
    ],
    config: [
      { id: "apiBasePath", group: "runtime", value: "/xwflow/v1", source: "file", editable: false },
      { id: "maxConcurrentRuns", group: "runtime", value: 20, source: "env", editable: true, min: 1, max: 200 },
      { id: "stepTimeoutS", group: "runtime", value: 30, source: "default", editable: true, min: 1, max: 900 },
      { id: "runRetentionDays", group: "retention", value: 30, source: "env", editable: true, min: 1, max: 365 },
      { id: "auditRetentionDays", group: "retention", value: 30, source: "default", editable: false },
      { id: "maxPayloadMb", group: "limits", value: 5, source: "default", editable: true, min: 1, max: 50 },
      { id: "webhookRatePerS", group: "limits", value: 50, source: "env", editable: true, min: 1, max: 1000 },
    ],
  };
}
