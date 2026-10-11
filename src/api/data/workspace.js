/**
 * Sample data for the workspace pages: templates, settings (members, API
 * keys, notifications), flow version history and the insight series.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const you = { id: "u_you", name: "You", isYou: true };
const sam = { id: "u_sam", name: "Sam Rivers", isYou: false };

export const templates = [
  {
    id: "tpl_order_alert",
    name: "Alert sales about big orders",
    summary: "When an order over a threshold arrives, look up the customer and post it to the sales channel.",
    category: "Sales",
    steps: [
      { name: "New order", type: "webhook", group: "trigger" },
      { name: "Look up customer", type: "http", group: "integration" },
      { name: "Over the threshold?", type: "condition", group: "control" },
      { name: "Post to sales", type: "message", group: "ai" },
    ],
    uses: 1840,
    minutesSaved: 6,
    popular: true,
    hue: "lime",
  },
  {
    id: "tpl_lead_score",
    name: "Score and route new leads",
    summary: "Score each lead with AI against your customer profile and add the strong ones to the CRM.",
    category: "Sales",
    steps: [
      { name: "New lead", type: "webhook", group: "trigger" },
      { name: "Score the lead", type: "aiCondition", group: "ai" },
      { name: "Clean the fields", type: "setFields", group: "data" },
      { name: "Add to the CRM", type: "http", group: "integration" },
    ],
    uses: 1210,
    minutesSaved: 9,
    popular: true,
    hue: "cyan",
  },
  {
    id: "tpl_invoice_digest",
    name: "Weekly invoice digest",
    summary: "Every Monday, collect open invoices and send finance a written summary of what is overdue.",
    category: "Finance",
    steps: [
      { name: "Every Monday", type: "schedule", group: "trigger" },
      { name: "Fetch open invoices", type: "http", group: "integration" },
      { name: "Write the digest", type: "aiCondition", group: "ai" },
      { name: "Email finance", type: "message", group: "integration" },
    ],
    uses: 960,
    minutesSaved: 25,
    popular: false,
    hue: "orange",
  },
  {
    id: "tpl_refund",
    name: "Refund approval",
    summary: "Check refund requests against the policy and wait for a person to approve the exceptions.",
    category: "Support",
    steps: [
      { name: "Refund requested", type: "webhook", group: "trigger" },
      { name: "Check the policy", type: "aiCondition", group: "ai" },
      { name: "Wait for approval", type: "wait", group: "control" },
      { name: "Issue the refund", type: "http", group: "integration" },
    ],
    uses: 702,
    minutesSaved: 12,
    popular: false,
    hue: "pink",
  },
  {
    id: "tpl_ticket_triage",
    name: "Triage support tickets",
    summary: "Read each new ticket, tag its topic and urgency, and assign it to the right queue.",
    category: "Support",
    steps: [
      { name: "New ticket", type: "webhook", group: "trigger" },
      { name: "Classify the ticket", type: "aiCondition", group: "ai" },
      { name: "Route by urgency", type: "condition", group: "control" },
      { name: "Assign the queue", type: "http", group: "integration" },
    ],
    uses: 1530,
    minutesSaved: 4,
    popular: true,
    hue: "violet",
  },
  {
    id: "tpl_sheet_sync",
    name: "Sync a table to a spreadsheet",
    summary: "Every hour, copy new rows from a table to a shared spreadsheet so the team sees them.",
    category: "Operations",
    steps: [
      { name: "Every hour", type: "schedule", group: "trigger" },
      { name: "Read new rows", type: "code", group: "data" },
      { name: "Append to the sheet", type: "setFields", group: "data" },
    ],
    uses: 2210,
    minutesSaved: 15,
    popular: true,
    hue: "cyan",
  },
  {
    id: "tpl_onboarding",
    name: "Welcome new customers",
    summary: "Send a welcome series over the first week and tell the account owner when the customer goes quiet.",
    category: "Marketing",
    steps: [
      { name: "Customer created", type: "webhook", group: "trigger" },
      { name: "Send welcome", type: "message", group: "integration" },
      { name: "Wait 3 days", type: "wait", group: "control" },
      { name: "Active yet?", type: "condition", group: "control" },
      { name: "Tell the owner", type: "message", group: "ai" },
    ],
    uses: 840,
    minutesSaved: 8,
    popular: false,
    hue: "lime",
  },
  {
    id: "tpl_incident",
    name: "Page on-call for failed runs",
    summary: "When a production run fails twice in a row, open an incident and page whoever is on call.",
    category: "Operations",
    steps: [
      { name: "Run failed", type: "webhook", group: "trigger" },
      { name: "Failed twice?", type: "condition", group: "control" },
      { name: "Open incident", type: "http", group: "integration" },
      { name: "Page on-call", type: "message", group: "integration" },
    ],
    uses: 515,
    minutesSaved: 10,
    popular: false,
    hue: "orange",
  },
];

export function seedWorkspace(now) {
  return {
    settings: {
      general: { name: "Personal", timezone: "Europe/London", language: "en", weekStart: "monday", retentionDays: 30 },
      members: [
        { id: "u_you", name: "You", email: "you@example.com", role: "owner", lastActiveAt: now - 5 * 60_000, isYou: true },
        { id: "u_sam", name: "Sam Rivers", email: "sam@example.com", role: "editor", lastActiveAt: now - 3 * HOUR, isYou: false },
        { id: "u_ana", name: "Ana Costa", email: "ana@example.com", role: "viewer", lastActiveAt: now - 4 * DAY, isYou: false },
        { id: "u_inv", name: "Lee Park", email: "lee@example.com", role: "editor", lastActiveAt: null, isYou: false, invited: true },
      ],
      apiKeys: [
        { id: "k_ci", name: "CI deploys", prefix: "xwf_live_4c1e", createdAt: now - 60 * DAY, lastUsedAt: now - 2 * HOUR, scopes: ["flows:write", "runs:read"] },
        { id: "k_bi", name: "Reporting export", prefix: "xwf_live_a90b", createdAt: now - 20 * DAY, lastUsedAt: now - 1 * DAY, scopes: ["runs:read"] },
      ],
      notifications: { failedRuns: true, dailyDigest: true, connectionExpiry: true, assistantDone: false, weeklyReport: true },
    },
    versions: {
      f_order_alert: [
        { id: "ver_6", number: 6, label: "Draft", note: "Disabled Notify sales while the threshold is checked.", author: you, at: now - 30 * 60_000, published: false, changes: { added: 0, changed: 1, removed: 0 } },
        { id: "ver_5", number: 5, label: "Live", note: "Retry the customer lookup three times.", author: you, at: now - 2 * DAY, published: true, changes: { added: 0, changed: 1, removed: 0 } },
        { id: "ver_4", number: 4, label: "", note: "Log every order to the Orders table.", author: sam, at: now - 6 * DAY, published: true, changes: { added: 1, changed: 0, removed: 0 } },
        { id: "ver_3", number: 3, label: "", note: "Branch on orders over 500.", author: you, at: now - 9 * DAY, published: true, changes: { added: 1, changed: 1, removed: 0 } },
        { id: "ver_2", number: 2, label: "", note: "Look up the customer before alerting.", author: you, at: now - 14 * DAY, published: true, changes: { added: 1, changed: 0, removed: 1 } },
        { id: "ver_1", number: 1, label: "", note: "First version.", author: you, at: now - 20 * DAY, published: true, changes: { added: 3, changed: 0, removed: 0 } },
      ],
    },
    /** Runs per day for the last 14 days, oldest first. */
    insightDays: [
      [96, 3], [104, 5], [88, 2], [121, 4], [130, 9], [74, 1], [62, 0],
      [112, 6], [118, 3], [109, 2], [140, 11], [136, 4], [80, 2], [68, 1],
    ].map(([succeeded, failed], index) => ({ day: now - (13 - index) * DAY, succeeded, failed })),
    insightCauses: [
      { cause: "Customer API answered 503", count: 21, flow: "Order alert" },
      { cause: "Mailbox token expired", count: 14, flow: "Weekly invoice digest" },
      { cause: "Sheet row limit reached", count: 9, flow: "Sync customers to the sheet" },
      { cause: "Lead without an email", count: 6, flow: "Lead intake" },
    ],
    insightSlowSteps: [
      { step: "Fetch open invoices", flow: "Weekly invoice digest", p95Ms: 2140 },
      { step: "Append to the sheet", flow: "Sync customers to the sheet", p95Ms: 1880 },
      { step: "Score the lead", flow: "Lead intake", p95Ms: 1320 },
      { step: "Look up customer", flow: "Order alert", p95Ms: 840 },
    ],
    minutesSavedPerRun: { f_order_alert: 6, f_invoice_digest: 25, f_sync_customers: 15, f_refund: 12, f_lead_intake: 9 },
  };
}
