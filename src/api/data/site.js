/**
 * Public website sample data. The integrations directory and the studio
 * palette both read `nodeTypes`, so a step listed on the site is a step
 * you can drag onto a canvas.
 */

export const nodeTypes = [
  { id: "webhook", label: "Webhook", group: "trigger", summary: "Start a run when an HTTP request arrives.", palette: true },
  { id: "schedule", label: "Schedule", group: "trigger", summary: "Start a run on a cron schedule, in your time zone.", palette: true },
  { id: "fieldChanged", label: "Field changed", group: "trigger", summary: "Start a run when a record field changes.", palette: false },
  { id: "http", label: "HTTP request", group: "integration", summary: "Call any HTTP API with your own credentials.", palette: true },
  { id: "code", label: "Code", group: "data", summary: "Run a script once per item or once per run.", palette: true },
  { id: "setFields", label: "Set fields", group: "data", summary: "Add, rename or remove fields on each item.", palette: true },
  { id: "condition", label: "Condition", group: "control", summary: "Send items down a yes or a no branch.", palette: true },
  { id: "switch", label: "Switch", group: "control", summary: "Route items to one of several outputs.", palette: false },
  { id: "merge", label: "Merge", group: "control", summary: "Join branches back into one stream.", palette: true },
  { id: "wait", label: "Wait", group: "control", summary: "Pause until a time or a condition.", palette: true },
  { id: "subFlow", label: "Sub-flow", group: "control", summary: "Call another flow as one step.", palette: false },
  {
    id: "aiCondition",
    label: "AI condition",
    group: "ai",
    summary:
      "Branch on a model's answer with three honest outputs: yes, no and unsure. The receipt records the verdict, model and token count, never the prompt.",
    palette: true,
    featured: true,
  },
];

export const dialects = [
  { code: "n8", name: "n8n", depth: null },
  { code: "Za", name: "Zapier", depth: null },
  { code: "PA", name: "Power Automate", depth: null },
  { code: "Mk", name: "Make", depth: null },
  { code: "Ap", name: "Activepieces", depth: null },
  { code: "Wm", name: "Windmill", depth: null },
  { code: "NR", name: "Node-RED", depth: null },
  { code: "Tm", name: "Temporal", depth: null },
  { code: "Af", name: "Airflow", depth: null },
  { code: "C8", name: "Camunda 8", depth: null },
];

export const notations = [
  { id: "node-graph", name: "Node graph", family: "automation", dims: "2D / 3D", standard: "Automation canvas, n8n style", summary: "Steps as nodes, data as wires. The default editing view.", tags: ["n8n dialect", "Activepieces"], view: "editor", concept: false },
  { id: "blueprint", name: "Blueprint graph", family: "automation", dims: "2D / 3D", standard: "Typed pins, execution wires", summary: "Execution and data travel on separate wires. Wire colour carries type; empty pins are hollow.", tags: ["Advanced editor"], view: null, concept: true },
  { id: "flowchart", name: "Classic flowchart", family: "process", dims: "2D / 3D", standard: "ISO 5807 symbols", summary: "Terminator, input, process, decision, document. The shapes everyone learned in school and draws in slides.", tags: ["Presentation style"], view: "flowchart", concept: false },
  { id: "swimlane", name: "Swimlanes", family: "process", dims: "2D / 3D", standard: "Cross-functional flowchart", summary: "One lane per actor or system, so hand-offs are visible where they cross a line.", tags: ["Horizontal or vertical"], view: "swimlane", concept: false },
  { id: "bpmn", name: "BPMN 2.0.2", family: "process", dims: "2D / 3D", standard: "OMG BPMN 2.0.2 / ISO/IEC 19510", summary: "Pools, lanes, message flows, events, gateways and data stores, with full collaboration semantics.", tags: ["Camunda 8 dialect"], view: "bpmn", concept: false },
  { id: "choreography", name: "BPMN choreography", family: "process", dims: "2D", standard: "BPMN 2.0, participant view", summary: "Who sends what to whom, without anyone's internals. Initiator in the light band.", tags: ["Partner contracts"], view: null, concept: true },
  { id: "conversation", name: "BPMN conversation", family: "process", dims: "2D", standard: "BPMN 2.0, message exchange map", summary: "The bird's-eye view: which parties talk, grouped by conversation.", tags: ["Landscape view"], view: null, concept: true },
  { id: "bpmn1", name: "BPMN 1.x", family: "process", dims: "2D", standard: "BPMN 1.0, 1.1, 1.2 (2004 to 2009)", summary: "Older notation-only models import cleanly. Shapes that 2.0 refined are shown as their 2.0.2 equivalents.", tags: ["Import"], view: null, concept: true },
  { id: "uml-activity", name: "UML activity", family: "software", dims: "2D / 3D", standard: "OMG UML 2.5.1", summary: "Forks and joins make parallel steps explicit. Guards sit on the arrows.", tags: ["Engineering teams"], view: null, concept: true },
  { id: "uml-sequence", name: "UML sequence", family: "software", dims: "2D / 3D", standard: "OMG UML 2.5.1 interaction", summary: "Time runs down the page. Every call, every reply, every retry, between every system.", tags: ["Built from the receipt"], view: "sequence", concept: false },
  { id: "state-machine", name: "State machine", family: "software", dims: "2D / 3D", standard: "UML 2.5.1 / statecharts", summary: "The life of one step: idle, running, done or failed, with retries drawn as real transitions.", tags: ["Step lifecycle"], view: null, concept: true },
  { id: "simulation", name: "Simulation", family: "simulation", dims: "2D / 3D", standard: "Discrete-event, Arena-style modules", summary: "Create, process, decide, dispose. Entities move, queues grow, counters tick. Test a flow under load before it goes live.", tags: ["What-if load"], view: "sim", concept: false },
  { id: "petri", name: "Petri net", family: "simulation", dims: "2D", standard: "Places, transitions, tokens", summary: "Concurrency made formal. Tokens show exactly which steps can fire right now.", tags: ["Verification"], view: null, concept: true },
  { id: "dag", name: "DAG pipeline", family: "automation", dims: "2D / 3D", standard: "Directed acyclic graph", summary: "Data pipelines as tasks that fan out and back in, coloured by their last state.", tags: ["Airflow dialect", "Windmill"], view: null, concept: false },
  { id: "dfd", name: "Data flow diagram", family: "analysis", dims: "2D", standard: "Gane-Sarson / Yourdon-DeMarco", summary: "What data goes where, through which process and into which store.", tags: ["Privacy reviews"], view: null, concept: true },
  { id: "epc", name: "EPC", family: "process", dims: "2D", standard: "Event-driven process chain", summary: "Events and functions alternate, joined by AND, OR and XOR connectors. Common in ERP process design.", tags: ["ERP teams"], view: null, concept: true },
  { id: "idef0", name: "IDEF0", family: "analysis", dims: "2D", standard: "IEEE 1320.1, ICOM arrows", summary: "Inputs left, controls top, outputs right, mechanisms below. A function, fully in context.", tags: ["Systems engineering"], view: null, concept: true },
  { id: "vsm", name: "Value stream map", family: "analysis", dims: "2D", standard: "Lean VSM", summary: "Cycle times from real receipts, waits between steps, and a timeline that shows where time is lost.", tags: ["Fed by receipts"], view: null, concept: true },
  { id: "sipoc", name: "SIPOC", family: "analysis", dims: "2D", standard: "Six Sigma scoping", summary: "The one-page scope of a flow: who feeds it, what it makes and who it serves.", tags: ["Kick-offs"], view: null, concept: true },
  { id: "decision-tree", name: "Decision tree", family: "analysis", dims: "2D / 3D", standard: "Branch logic", summary: "Every condition and outcome as a tree, so you can check that no case is missing.", tags: ["Rule review"], view: null, concept: true },
  { id: "timeline", name: "Timeline", family: "views", dims: "2D / 3D", standard: "Run Gantt from the receipt", summary: "Each attempt is a bar, so the slow and the failed are obvious at a glance.", tags: ["Temporal-style history"], view: "receipt", concept: false },
  { id: "code", name: "Flow as code", family: "views", dims: "Text", standard: "Mermaid-compatible text", summary: "Paste it into docs, review it in a pull request, keep it in git next to your code.", tags: ["Export"], view: null, concept: true },
  { id: "list", name: "List mode", family: "views", dims: "Accessible", standard: "WCAG 2.2 AA equivalent", summary: "Every canvas action in an ordered list. Branches indent. Nothing needs a mouse.", tags: ["Keyboard", "Screen reader"], view: null, concept: false },
  { id: "3d", name: "3D space", family: "views", dims: "3D", standard: "Any notation, lifted", summary: "Lanes become floors and steps float by depth. Great for big flows and walk-throughs.", tags: ["Orbit and tilt"], view: "3d", concept: false },
];

export const pricing = {
  tiers: [
    {
      id: "core",
      tag: { label: "Open source", color: "lime" },
      name: "Core",
      blurb: "Self-hosted, Apache-2.0.",
      price: { kind: "free" },
      cta: { label: "Self-host quickstart", target: "selfHost", style: "glass" },
      features: [
        "Studio canvas, palette, inspector, run view",
        "Run receipts and executions",
        "Credentials kept on your servers",
        "Versions, publish requests, graph diff",
        "Audit view and download, alert routing",
        "One tenant",
      ],
      planned: false,
      highlighted: false,
    },
    {
      id: "commercial",
      tag: { label: "Most chosen", color: "violet" },
      name: "Commercial",
      blurb: "Hosted by us or licensed to run yourself.",
      price: { kind: "quote", amount: null, unit: null },
      cta: { label: "Talk to us", target: "contact", style: "primary" },
      features: [
        "Everything in Core",
        "Per-tenant brand kit and custom domain",
        "Many tenants, with switching",
        "Audit streaming to your SIEM",
        "Single sign-on configuration",
        "Custom role authoring",
      ],
      planned: false,
      highlighted: true,
    },
    {
      id: "whitelabel",
      tag: { label: "Resellers", color: "pink" },
      name: "White-label",
      blurb: "Ship it as your own product.",
      price: { kind: "contact" },
      cta: { label: "Ask about reselling", target: "contact", style: "gradient" },
      features: [
        "No xwflow mark on any branded screen",
        "Your OAuth client on consent screens",
        "Embeddable studio with session handoff",
        "Template library and connector allow-list per tenant",
      ],
      planned: true,
      highlighted: false,
    },
  ],
  comparison: [
    { capability: "Studio canvas, palette, inspector, run view", core: { kind: "included" }, commercial: { kind: "included" } },
    { capability: "Executions and run receipts", core: { kind: "included" }, commercial: { kind: "included" } },
    { capability: "Credentials, values never shown", core: { kind: "included" }, commercial: { kind: "included" } },
    { capability: "Versions, publish requests, approvals, graph diff", core: { kind: "included" }, commercial: { kind: "included" } },
    { capability: "Audit view and download", core: { kind: "included" }, commercial: { kind: "included" } },
    { capability: "Built-in roles, alert routing, readiness checklist", core: { kind: "included" }, commercial: { kind: "included" } },
    { capability: "Tenants", core: { kind: "text", text: "One" }, commercial: { kind: "text", text: "Many, with switching" } },
    { capability: "Per-tenant brand kit and custom domain", core: { kind: "requires", tier: "Commercial" }, commercial: { kind: "included" } },
    { capability: "Audit streaming to SIEM", core: { kind: "requires", tier: "Commercial" }, commercial: { kind: "included" } },
    { capability: "Single sign-on configuration", core: { kind: "requires", tier: "Commercial" }, commercial: { kind: "included" } },
    { capability: "Custom role authoring", core: { kind: "requires", tier: "Commercial" }, commercial: { kind: "included" } },
    { capability: "Paid template tiers", core: { kind: "requires", tier: "Commercial" }, commercial: { kind: "included" } },
  ],
};

export const selfHost = {
  defaults: [
    { id: "api", label: "API", value: "127.0.0.1:8090" },
    { id: "basePath", label: "Base path", value: "/xwflow/v1" },
    { id: "studio", label: "Studio", value: "127.0.0.1:5178" },
  ],
  steps: [
    {
      id: "install",
      title: "Install the package",
      body: "The default install is lean. Optional features load only when you add their extra.",
      code: [{ comment: "any Python environment" }, { command: "pip", args: "install", value: "exonware-xwflow" }],
    },
    {
      id: "api",
      title: "Start the API",
      body: "It answers under {basePath} on {api} by default.",
      code: [{ comment: "exact command: from the release notes" }, { placeholder: "START COMMAND" }],
    },
    {
      id: "check",
      title: "Check that it answers",
      body: "The catalog returns JSON. If you get an HTML page, the studio is being served where the API should be.",
      code: [{ command: "curl", url: "http://127.0.0.1:8090/xwflow/v1/node-types" }],
    },
    {
      id: "studio",
      title: "Open the studio",
      body: "The web tier serves on {studio}. Change it with XWFLOW_WEB_HOST and XWFLOW_WEB_PORT.",
      code: [{ placeholder: "WEB START COMMAND" }],
    },
  ],
  pendingCommands: 2,
};

export const tenants = [
  { name: "Atlas Ops", color: "cyan", hue: 190 },
  { name: "Nova Flow", color: "pink", hue: 330 },
  { name: "Acme Auto", color: "lime", hue: 80 },
];
