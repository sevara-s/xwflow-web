/**
 * Studio sample data. Every time is an offset from `now`, so the sample
 * workspace always reads as recent activity ("2 min ago") whenever it loads.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const people = {
  you: { id: "u_you", name: "You", isYou: true },
  sam: { id: "u_sam", name: "Sam Rivers", isYou: false },
};

/** Lay steps out left to right, the way a new flow appears on the canvas. */
function linear(steps) {
  return steps.map((step, index) => ({
    state: "normal",
    outputs: 1,
    ...step,
    x: 296 + index * 300,
    y: 360,
  }));
}

function chainEdges(nodes) {
  return nodes.slice(1).map((node, index) => ({ from: nodes[index].id, to: node.id, style: "active" }));
}

function linearGraph(steps) {
  const nodes = linear(steps);
  return { nodes, edges: chainEdges(nodes), notes: [], frames: [] };
}

const orderAlertGraph = {
  nodes: [
    { id: "n_order", name: "New order", type: "webhook", group: "trigger", x: 296, y: 360, state: "pinned", outputs: 1 },
    { id: "n_lookup", name: "Look up customer", type: "http", group: "integration", x: 496, y: 360, state: "normal", outputs: 1 },
    { id: "n_over", name: "Over 500?", type: "condition", group: "control", x: 696, y: 350, height: 100, state: "normal", outputs: 2 },
    { id: "n_notify", name: "Notify sales", type: "message", group: "ai", x: 906, y: 250, state: "disabled", outputs: 0 },
    { id: "n_log", name: "Log order", type: "appendRow", group: "data", x: 906, y: 470, state: "normal", outputs: 0 },
  ],
  edges: [
    { from: "n_order", to: "n_lookup", style: "active" },
    { from: "n_lookup", to: "n_over", style: "active" },
    { from: "n_over", to: "n_notify", port: 0, label: "yes", style: "active" },
    { from: "n_over", to: "n_log", port: 1, label: "no", style: "idle" },
  ],
  notes: [{ x: 300, y: 196, width: 230, text: "Check the 500 threshold with finance before publishing." }],
  frames: [{ x: 282, y: 318, width: 380, height: 168, label: "Intake" }],
};

function flows(now) {
  return [
    {
      id: "f_order_alert",
      name: "Order alert",
      folder: "Sales",
      status: "published",
      trigger: { kind: "webhook" },
      owner: people.you,
      updatedAt: now - 3 * HOUR,
      graph: orderAlertGraph,
    },
    {
      id: "f_invoice_digest",
      name: "Weekly invoice digest",
      folder: "Finance",
      status: "changed",
      trigger: { kind: "weekly", weekday: 1, hour: 8, minute: 0 },
      owner: people.you,
      updatedAt: now - 1 * DAY,
      graph: linearGraph([
        { id: "n_monday", name: "Every Monday", type: "schedule", group: "trigger" },
        { id: "n_invoices", name: "Fetch open invoices", type: "http", group: "integration" },
        { id: "n_digest", name: "Write the digest", type: "aiCondition", group: "ai" },
      ]),
    },
    {
      id: "f_sync_customers",
      name: "Sync customers to the sheet",
      folder: "Operations",
      status: "published",
      trigger: { kind: "interval", unit: "hour" },
      owner: people.sam,
      updatedAt: now - 3 * DAY,
      graph: linearGraph([
        { id: "n_hourly", name: "Every hour", type: "schedule", group: "trigger" },
        { id: "n_read", name: "Read new customers", type: "code", group: "data" },
        { id: "n_sheet", name: "Append to the sheet", type: "setFields", group: "data" },
      ]),
    },
    {
      id: "f_refund",
      name: "Refund approval",
      folder: "Finance",
      status: "draft",
      trigger: { kind: "webhook" },
      owner: people.you,
      updatedAt: now - 7 * DAY,
      graph: linearGraph([
        { id: "n_refund", name: "Refund requested", type: "webhook", group: "trigger" },
        { id: "n_policy", name: "Check the refund policy", type: "aiCondition", group: "ai" },
        { id: "n_wait", name: "Wait for approval", type: "wait", group: "control" },
      ]),
    },
    {
      id: "f_lead_intake",
      name: "Lead intake",
      folder: "Sales",
      status: "published",
      trigger: { kind: "webhook" },
      owner: people.sam,
      updatedAt: now - 14 * DAY,
      graph: linearGraph([
        { id: "n_lead", name: "New lead", type: "webhook", group: "trigger" },
        { id: "n_score", name: "Score the lead", type: "aiCondition", group: "ai" },
        { id: "n_clean", name: "Clean the fields", type: "setFields", group: "data" },
        { id: "n_crm", name: "Add to the CRM", type: "http", group: "integration" },
      ]),
    },
  ];
}

/** Inspector parameters for steps that have more than a name. */
const stepDetails = {
  n_lookup: {
    fields: [
      { id: "method", label: "Method", kind: "select", value: "GET", options: ["GET", "POST"] },
      {
        id: "url",
        label: "URL",
        kind: "text",
        value: "https://api.example.com/customers/",
        expression: "order.customer_id",
        lastResult: "c_1042",
      },
      { id: "credential", label: "Credential", kind: "credential", value: "c_customer_api" },
    ],
    retry: { enabled: true, tries: 3, delayMs: 1000 },
  },
  n_over: {
    fields: [{ id: "rule", label: "Rule", kind: "text", value: "order.total > 500" }],
    retry: { enabled: false, tries: 1, delayMs: 0 },
  },
  n_notify: {
    fields: [
      { id: "channel", label: "Channel", kind: "text", value: "#sales" },
      { id: "credential", label: "Credential", kind: "credential", value: "c_sales_chat" },
    ],
    retry: { enabled: false, tries: 1, delayMs: 0 },
  },
  n_log: {
    fields: [{ id: "table", label: "Table", kind: "text", value: "Orders" }],
    retry: { enabled: false, tries: 1, delayMs: 0 },
  },
  n_invoices: {
    fields: [
      { id: "method", label: "Method", kind: "select", value: "GET", options: ["GET", "POST"] },
      { id: "url", label: "URL", kind: "text", value: "https://api.example.com/invoices?status=open" },
      { id: "credential", label: "Credential", kind: "credential", value: "c_finance_mailbox" },
    ],
    retry: { enabled: true, tries: 3, delayMs: 1000 },
  },
};


/** The recorded attempts of the run the receipt board shows. */
function orderAlertAttempts() {
  return [
    {
      id: "a1", nodeId: "n_order", step: "New order", tryIndex: 1, tryCount: 1,
      result: { kind: "pinned" }, payload: "stored", inCount: 0, outCount: 1, durationMs: null, offsetMs: 0,
      io: { input: { source: "pinned" }, output: { order_id: "o_5531", customer_id: "c_1042", total: 742 }, error: null },
    },
    {
      id: "a2", nodeId: "n_lookup", step: "Look up customer", tryIndex: 1, tryCount: 3,
      result: { kind: "failed", code: 503 }, payload: "stored", inCount: 1, outCount: 0, durationMs: 840, offsetMs: 2,
      io: {
        input: { method: "GET", url: "https://api.example.com/customers/c_1042", credential: "Customer API" },
        output: {},
        error: { status: 503, message: "Service unavailable" },
      },
    },
    {
      id: "a3", nodeId: "n_lookup", step: "Look up customer", tryIndex: 2, tryCount: 3,
      result: { kind: "succeeded" }, payload: "stored", inCount: 1, outCount: 1, durationMs: 212, offsetMs: 846,
      io: {
        input: { method: "GET", url: "https://api.example.com/customers/c_1042", credential: "Customer API" },
        output: { id: "c_1042", name: "Harbor Supply", tier: "gold" },
        error: null,
      },
    },
    {
      id: "a4", nodeId: "n_over", step: "Over 500?", tryIndex: 1, tryCount: 1,
      result: { kind: "branch", branch: "yes" }, payload: "keys", inCount: 1, outCount: 1, durationMs: 3, offsetMs: 1061,
      io: { input: { total: 742 }, output: { branch: "yes" }, error: null },
    },
    {
      id: "a5", nodeId: "n_notify", step: "Notify sales", tryIndex: null, tryCount: null,
      result: { kind: "disabled" }, payload: "none", inCount: 0, outCount: 0, durationMs: null, offsetMs: null,
      io: { input: {}, output: {}, error: null },
    },
    {
      id: "a6", nodeId: "n_log", step: "Log order", tryIndex: null, tryCount: null,
      result: { kind: "notRun" }, payload: "none", inCount: 0, outCount: 0, durationMs: null, offsetMs: null,
      io: { input: {}, output: {}, error: null },
    },
  ];
}

function runs(now) {
  return [
    { id: "r_7f3a", flowId: "f_lead_intake", status: "running", mode: "production", startedAt: now - 20_000, durationMs: null },
    { id: "r_7f39", flowId: "f_order_alert", status: "retried", mode: "test", startedAt: now - 2 * MINUTE, durationMs: 1055, attempts: orderAlertAttempts() },
    { id: "r_7f31", flowId: "f_sync_customers", status: "succeeded", mode: "production", startedAt: now - 1 * HOUR, durationMs: 4870 },
    { id: "r_7f1c", flowId: "f_order_alert", status: "failed", mode: "production", startedAt: now - 1 * HOUR - 24 * MINUTE, durationMs: 840 },
    { id: "r_7f1d", flowId: "f_order_alert", status: "succeeded", mode: "retry", startedAt: now - 1 * HOUR - 23 * MINUTE, durationMs: 986 },
    { id: "r_7e10", flowId: "f_invoice_digest", status: "failed", mode: "production", startedAt: now - 1 * DAY - 4 * HOUR, durationMs: 2310 },
    { id: "r_7d02", flowId: "f_order_alert", status: "succeeded", mode: "replay", startedAt: now - 2 * DAY - 20 * HOUR, durationMs: 1102 },
  ];
}

/** Runs per hour today, oldest first; `failed` marks hours with a failure. */
const runsPerHour = [2, 3, 1, 4, 6, 5, 8, 7, 9, 6, 4, 7, 10, 3].map((runs, index) => ({
  runs,
  failed: index === 6 || index === 11,
}));

function connections(now) {
  return [
    {
      id: "c_finance_mailbox", name: "Finance mailbox", app: "mail", auth: "oauth", owner: people.you,
      health: "broken", scopes: ["send email"], audience: "Finance", usedBy: 1, lastUsedAt: now - 2 * DAY,
      expiresAt: now - 1 * DAY - 4 * HOUR, brokenFlow: "Weekly invoice digest", group: "ai",
    },
    {
      id: "c_sales_chat", name: "Sales chat workspace", app: "chat", auth: "oauth", owner: people.sam,
      health: "expiring", scopes: ["post messages"], audience: "Only you", usedBy: 1, lastUsedAt: now - 1 * DAY,
      expiresAt: now + 6 * DAY, brokenFlow: null, group: "control",
    },
    {
      id: "c_customer_api", name: "Customer API", app: "http", auth: "apiKey", owner: people.you,
      health: "healthy", scopes: ["read"], audience: "Sales", usedBy: 3, lastUsedAt: now - 2 * MINUTE,
      expiresAt: null, brokenFlow: null, group: "integration",
    },
    {
      id: "c_orders_db", name: "Orders database", app: "database", auth: "password", owner: people.sam,
      health: "healthy", scopes: ["read", "write"], audience: "Operations", usedBy: 2, lastUsedAt: now - 1 * HOUR,
      expiresAt: null, brokenFlow: null, group: "data",
    },
  ];
}

function workspace(now) {
  return {
    project: {
      id: "p_personal",
      name: "Personal",
      visibility: "private",
      description: "All the flows, agents, tables, forms, connections, variables, runs and MCP servers in this project.",
    },
    you: people.you,
    usage: { used: 380, included: 1000, periodEnds: now + 21 * DAY },
    chats: [
      { id: "c1", title: "Order alert to sales", waiting: false },
      { id: "c2", title: "Weekly invoice digest", waiting: true },
    ],
  };
}

const assistant = {
  suggestions: [
    { id: "s_order", label: "Alert me when a new order arrives" },
    { id: "s_digest", label: "Send a weekly digest" },
    { id: "s_answer", label: "Answer customer questions" },
    { id: "s_sync", label: "Keep two tables in sync" },
  ],
  activeSuggestion: "s_order",
  starters: [
    { id: "flow", label: "Flow", hint: "Automated workflows", group: "trigger", route: "flows" },
    { id: "agent", label: "Agent", hint: "AI teammates", group: "ai", route: null },
    { id: "table", label: "Table", hint: "Automated data", group: "data", route: null },
    { id: "form", label: "Form", hint: "Automation-ready forms", group: "control", route: null },
    { id: "mcp", label: "MCP server", hint: "AI tool integrations", group: "integration", route: null },
  ],
  recommended: [
    { id: "t1", title: "Order alert to a chat channel", summary: "", groups: ["trigger", "control", "ai"], toConnect: 1, top: true },
    { id: "t2", title: "Weekly digest by email", summary: "Schedule, HTTP request, Send email", groups: ["trigger", "integration", "ai"], toConnect: null, top: false },
    { id: "t3", title: "Log new records to a table", summary: "Field changed, Set fields, Append row", groups: ["trigger", "data", "data"], toConnect: null, top: false },
  ],
};

/** Drafts the assistant can propose, matched by keywords in the request. */
const draftRecipes = [
  {
    keywords: ["order", "sale", "500"],
    title: "Alert me when a new order arrives",
    steps: [
      { id: "d_order", name: "New order", type: "webhook", group: "trigger" },
      { id: "d_over", name: "Order over 500?", type: "condition", group: "control" },
      { id: "d_notify", name: "Notify sales", type: "needsConnection", group: "ai" },
    ],
  },
  {
    keywords: ["digest", "weekly", "email", "report"],
    title: "Send a weekly digest",
    steps: [
      { id: "d_week", name: "Every Monday", type: "schedule", group: "trigger" },
      { id: "d_fetch", name: "Fetch the numbers", type: "http", group: "integration" },
      { id: "d_mail", name: "Send the digest", type: "needsConnection", group: "ai" },
    ],
  },
  {
    keywords: ["question", "customer", "answer", "support"],
    title: "Answer customer questions",
    steps: [
      { id: "d_ask", name: "New question", type: "webhook", group: "trigger" },
      { id: "d_draft", name: "Draft an answer", type: "aiCondition", group: "ai" },
      { id: "d_reply", name: "Reply to the customer", type: "needsConnection", group: "integration" },
    ],
  },
  {
    keywords: ["sync", "table", "sheet", "row"],
    title: "Keep two tables in sync",
    steps: [
      { id: "d_change", name: "Row changed", type: "schedule", group: "trigger" },
      { id: "d_map", name: "Map the fields", type: "setFields", group: "data" },
      { id: "d_write", name: "Write to the other table", type: "appendRow", group: "data" },
    ],
  },
];

export function seedStudio(now) {
  return {
    people,
    workspace: workspace(now),
    flows: flows(now),
    stepDetails,
    runs: runs(now),
    runsPerHour,
    connections: connections(now),
    assistant,
    draftRecipes,
    retentionDays: 30,
  };
}

export { linearGraph };
