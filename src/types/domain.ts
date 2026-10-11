/** Shapes returned by the dummy API. Times are epoch milliseconds. */

export type StepGroup = "trigger" | "control" | "data" | "ai" | "integration";

/** Visual status vocabulary shared by every list, ledger and canvas node. */
export type StatusTone = "ok" | "err" | "run" | "idle" | "warn" | "pin" | "dis";

export type FlowStatus = "published" | "changed" | "draft";

export type RunStatus = "running" | "succeeded" | "retried" | "failed";

export type RunMode = "production" | "test" | "retry" | "replay";

export type FlowTrigger =
  | { kind: "webhook" }
  | { kind: "interval"; unit: "hour" | "day" }
  | { kind: "weekly"; weekday: number; hour: number; minute: number };

export interface Person {
  id: string;
  name: string;
  isYou: boolean;
}

export interface Workspace {
  project: { id: string; name: string; visibility: "private" | "shared"; description: string };
  you: Person;
  usage: { used: number | null; included: number | null; periodEnds: number | null; ratio: number };
  chats: Array<{ id: string; title: string; waiting: boolean }>;
}

export interface FlowSummary {
  id: string;
  name: string;
  folder: string;
  status: FlowStatus;
  chain: StepGroup[];
  trigger: FlowTrigger;
  lastRun: { status: RunStatus; at: number } | null;
  owner: Person;
  updatedAt: number;
}

export interface FlowCounts {
  published: number;
  running: number;
  failed24h: number;
  drafts: number;
}

export interface FlowList {
  flows: FlowSummary[];
  counts: FlowCounts;
  folders: string[];
}

export interface FlowQuery {
  q?: string;
  status?: FlowStatus | "";
  folder?: string;
}

export interface CanvasNode {
  id: string;
  name: string;
  type: string;
  group: StepGroup;
  x: number;
  y: number;
  height?: number;
  state: "normal" | "pinned" | "disabled";
  outputs: number;
}

export interface CanvasEdge {
  from: string;
  to: string;
  port?: number;
  label?: string;
  style: "active" | "idle";
}

export interface CanvasNote {
  x: number;
  y: number;
  width: number;
  text: string;
}

export interface CanvasFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface FlowGraph {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  notes: CanvasNote[];
  frames: CanvasFrame[];
}

export interface StepField {
  id: string;
  label: string;
  kind: "select" | "text" | "credential";
  value: string;
  options?: string[];
  expression?: string;
  lastResult?: string;
}

export interface StepDetail {
  nodeId: string;
  fields: StepField[];
  retry: { enabled: boolean; tries: number; delayMs: number };
}

export interface PaletteGroup {
  group: StepGroup;
  items: Array<{ id: string; label: string; group: StepGroup }>;
}

export interface FlowDetail {
  flow: FlowSummary;
  graph: FlowGraph;
  steps: StepDetail[];
  palette: PaletteGroup[];
  latestRunId: string | null;
}

export type AttemptResult =
  | { kind: "pinned" }
  | { kind: "received" }
  | { kind: "succeeded" }
  | { kind: "failed"; code: number }
  | { kind: "branch"; branch: string }
  | { kind: "disabled" }
  | { kind: "notRun" };

export type Payload = Record<string, unknown>;

export interface Attempt {
  id: string;
  nodeId: string;
  step: string;
  group: StepGroup;
  tryIndex: number | null;
  tryCount: number | null;
  result: AttemptResult;
  payload: "stored" | "keys" | "none";
  inCount: number;
  outCount: number;
  durationMs: number | null;
  offsetMs: number | null;
  io: { input: Payload; output: Payload; error: Payload | null };
}

export interface RunSummary {
  id: string;
  flowId: string;
  flowName: string;
  status: RunStatus;
  mode: RunMode;
  startedAt: number;
  durationMs: number | null;
}

export interface RunDetail extends RunSummary {
  number: number;
  attempts: Attempt[];
  stepCount: number;
  recordedSteps: number;
  retentionDays: number;
  expiresAt: number;
  problem: { step: string; tryIndex: number; tryCount: number; code: number; recovered: boolean } | null;
}

export interface RunCounts {
  running: number;
  succeeded7d: number;
  failed7d: number;
  asOf: number;
  perHour: Array<{ runs: number; failed: boolean }>;
}

export interface RunQuery {
  q?: string;
  status?: RunStatus | "";
  mode?: RunMode | "";
  /** Only runs that started within this many days. */
  days?: number;
}

export interface RunList {
  runs: RunSummary[];
  counts: RunCounts;
}

export type ConnectionHealth = "healthy" | "expiring" | "broken";

export interface Connection {
  id: string;
  name: string;
  app: string;
  auth: "oauth" | "apiKey" | "password";
  owner: Person;
  health: ConnectionHealth;
  scopes: string[];
  audience: string;
  usedBy: number;
  lastUsedAt: number | null;
  expiresAt: number | null;
  brokenFlow: string | null;
  group: StepGroup;
}

export interface ConnectionQuery {
  q?: string;
  health?: ConnectionHealth | "";
}

export interface AssistantHome {
  suggestions: Array<{ id: string; label: string }>;
  activeSuggestion: string;
  preview: { title: string; graph: FlowGraph };
  starters: Array<{ id: string; label: string; hint: string; group: StepGroup; route: string | null }>;
  recommended: Array<{ id: string; title: string; summary: string; groups: StepGroup[]; toConnect: number | null; top: boolean }>;
}

export interface AssistantDraft {
  prompt: string;
  title: string;
  graph: FlowGraph;
}

/* ------------------------------------------------------------------ */
/* Public website                                                      */
/* ------------------------------------------------------------------ */

export interface NodeType {
  id: string;
  label: string;
  group: StepGroup;
  summary: string;
  palette: boolean;
  featured?: boolean;
}

export interface Dialect {
  code: string;
  name: string;
  /** Import depth from the adapter catalog; null until the catalog states it. */
  depth: string | null;
}

export type NotationFamily = "automation" | "process" | "software" | "simulation" | "analysis" | "views";
export type NotationViewId = "editor" | "flowchart" | "swimlane" | "bpmn" | "sequence" | "sim" | "3d" | "receipt";

export interface Notation {
  id: string;
  name: string;
  family: NotationFamily;
  dims: string;
  standard: string;
  summary: string;
  tags: string[];
  view: NotationViewId | null;
  concept: boolean;
}

export interface Tenant {
  name: string;
  color: "cyan" | "pink" | "lime";
  hue: number;
}

export interface Landing {
  stats: { connectors: number; dialects: number; rowsPerAttempt: number; vendorMarks: number };
  marquee: Array<{ id: string; label: string; group: StepGroup }>;
  flow: { id: string; name: string; graph: FlowGraph };
  receipt: RunDetail | null;
  tenants: Tenant[];
  notations: Array<Pick<Notation, "id" | "name" | "family" | "view" | "concept">>;
  dialects: Dialect[];
}

export type Cell = { kind: "included" } | { kind: "text"; text: string } | { kind: "requires"; tier: string };

export interface PricingTier {
  id: string;
  tag: { label: string; color: "lime" | "violet" | "pink" };
  name: string;
  blurb: string;
  price: { kind: "free" } | { kind: "quote"; amount: number | null; unit: string | null } | { kind: "contact" };
  cta: { label: string; target: "selfHost" | "contact"; style: "glass" | "primary" | "gradient" };
  features: string[];
  planned: boolean;
  highlighted: boolean;
}

export interface Pricing {
  tiers: PricingTier[];
  comparison: Array<{ capability: string; core: Cell; commercial: Cell }>;
}

export type CodeToken =
  | { comment: string }
  | { command: string; args?: string; value?: string; url?: string }
  | { placeholder: string };

export interface SelfHost {
  defaults: Array<{ id: string; label: string; value: string }>;
  steps: Array<{ id: string; title: string; body: string; code: CodeToken[] }>;
  pendingCommands: number;
}

export interface NotationGallery {
  items: Notation[];
  total: number;
  /** The flow every thumbnail draws. */
  sample: { flowId: string; runId: string | null; steps: Array<{ id: string; name: string; type: string; group: StepGroup }> };
}

/* ------------------------------------------------------------------ */
/* Admin and system                                                    */
/* ------------------------------------------------------------------ */

export type HealthState = "ok" | "warn" | "err";

export interface AdminContext {
  tenant: { id: string; name: string; plan: "core" | "commercial" };
  health: HealthState;
}

export interface Service {
  id: string;
  label: string;
  state: HealthState;
  reach: boolean;
  downSince?: number;
  lastGood?: number;
  heartbeatAgeS?: number;
}

export interface AdminOverview {
  kpis: Array<{ id: "runs24h" | "failed24h" | "overdue" | "queued"; value: number | null; asOf: number | null; note: "noAdmission" | null }>;
  runsByHour: Array<{ succeeded: number; failed: number }>;
  failing: Array<{ flowId: string; flow: string; tenant: string; failed: number; cause: string }>;
  reachability: Service[];
}

export interface BrandKit {
  productName: string;
  assistantName: string;
  primary: string;
  swatches: string[];
  typefaces: string[];
  typeface: string;
  removeMarks: boolean;
  domain: string;
  background: string;
  plan: "core" | "commercial";
}

export type ActorClass = "person" | "assistant" | "agent" | "system";

export interface AuditEvent {
  id: string;
  kind: string;
  group: StepGroup;
  title: string;
  object: { name: string; type: string; note?: string };
  actor: { name: string; class: ActorClass };
  onBehalfOf: string | null;
  at: number;
}

export interface AuditQuery {
  actor?: string;
  actorClass?: ActorClass | "";
  action?: string;
  objectType?: string;
  days?: number;
}

export interface AuditList {
  events: AuditEvent[];
  retentionDays: number;
  actors: string[];
  actions: string[];
  objectTypes: string[];
}

export interface HealthCheck {
  id: string;
  label: string;
  state: HealthState;
  checkedAt: number;
  summary: "unreachable" | "lateHeartbeat" | "answering" | "heartbeating" | "draining" | "connected";
  detail: Record<string, number | string>;
}

export interface Health {
  checks: HealthCheck[];
  uptime: Array<{ service: string; days: HealthState[] }>;
  log: Array<{ at: number; source: string; tone: HealthState; message: string }>;
  services: Service[];
}

export interface AccessDenial {
  page: string;
  missingRole: string;
  grantedBy: string;
  yourRole: string;
}

/* ------------------------------------------------------------------ */
/* Notation views                                                      */
/* ------------------------------------------------------------------ */

export type SystemId = "source" | "engine" | "api" | "chat" | "table";

export interface ViewStep {
  id: string;
  name: string;
  type: string;
  group: StepGroup;
  state: CanvasNode["state"];
  outputs: number;
  system: SystemId;
}

export interface FlowView {
  flow: FlowSummary;
  steps: ViewStep[];
  edges: CanvasEdge[];
  graph: FlowGraph;
  notes: CanvasNote[];
  systems: Array<{ id: SystemId; name: string }>;
  runs: RunDetail[];
  simulation: SimulationModel;
}

export interface SimulationModel {
  arrivalsPerHour: number;
  serviceSeconds: number;
  workers: number;
  /** Share of orders over the threshold, which send an alert. */
  overShare: number;
  hours: number;
  seed: number;
}

/* ------------------------------------------------------------------ */
/* Project areas: agents, tables, forms, variables, MCP servers        */
/* ------------------------------------------------------------------ */

export type AreaHue = "lime" | "cyan" | "violet" | "pink" | "orange";

export type AgentStatus = "live" | "paused" | "draft";

export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  status: AgentStatus;
  tools: Array<{ label: string; group: StepGroup }>;
  conversations7d: number;
  /** Share of conversations closed without a person; null before any. */
  resolvedRate: number | null;
  handoffs7d: number;
  lastActiveAt: number | null;
  owner: Person;
  hue: AreaHue;
}

export interface AgentList {
  agents: Agent[];
  counts: { live: number; conversations7d: number; handoffs7d: number };
}

export interface DataColumn {
  key: string;
  label: string;
  type: "text" | "number" | "choice" | "date";
}

export interface DataTableSummary {
  id: string;
  name: string;
  description: string;
  columns: DataColumn[];
  columnCount: number;
  rowCount: number;
  usedBy: string[];
  updatedAt: number;
  hue: AreaHue;
}

export interface DataTable extends Omit<DataTableSummary, "columnCount"> {
  records: Array<Record<string, string | number>>;
}

export type FormStatus = "live" | "draft";

export interface ProjectForm {
  id: string;
  name: string;
  status: FormStatus;
  fields: number;
  submissions7d: number;
  views7d: number;
  /** Submissions per day, oldest first. */
  daily: number[];
  flow: { id: string; name: string } | null;
  path: string;
  updatedAt: number;
  hue: AreaHue;
}

export type VariableScope = "all" | "production" | "test";

export interface ProjectVariable {
  id: string;
  key: string;
  /** Null for a secret: the value never reaches the browser. */
  value: string | null;
  secret: boolean;
  scope: VariableScope;
  usedBy: number;
  updatedAt: number;
  owner: Person;
}

export type McpStatus = "connected" | "error" | "disabled";

export interface McpServer {
  id: string;
  name: string;
  url: string;
  transport: "http" | "stdio";
  status: McpStatus;
  tools: string[];
  calls24h: number;
  latencyMs: number | null;
  lastError: string | null;
  hue: AreaHue;
}

/* ------------------------------------------------------------------ */
/* Workspace pages: overview, templates, insights, settings, versions  */
/* ------------------------------------------------------------------ */

export interface AttentionItem {
  kind: "run" | "connection" | "mcp" | "chat" | "agent";
  id: string;
  title: string;
  tone: "error" | "warning";
  at: number;
}

export interface Overview {
  you: Person;
  today: { runs: number; failed: number; running: number };
  counts: { published: number; drafts: number; liveAgents: number; connections: number };
  week: Array<{ value: number; alert: boolean }>;
  attention: AttentionItem[];
  recent: RunSummary[];
}

export interface FlowTemplate {
  id: string;
  name: string;
  summary: string;
  category: string;
  steps: Array<{ name: string; type: string; group: StepGroup }>;
  uses: number;
  minutesSaved: number;
  popular: boolean;
  hue: AreaHue;
}

export interface TemplateList {
  templates: FlowTemplate[];
  categories: string[];
}

export interface Insights {
  days: Array<{ day: number; succeeded: number; failed: number }>;
  totals: { runs: number; failed: number; successRate: number; avgMs: number | null; minutesSaved: number };
  topFlows: Array<{ flowId: string; name: string; runs: number; failed: number; minutesSaved: number }>;
  causes: Array<{ cause: string; count: number; flow: string }>;
  slowSteps: Array<{ step: string; flow: string; p95Ms: number }>;
}

export type MemberRole = "owner" | "editor" | "viewer";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  lastActiveAt: number | null;
  isYou: boolean;
  invited?: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: number;
  lastUsedAt: number | null;
  scopes: string[];
}

export interface NotificationPrefs {
  failedRuns: boolean;
  dailyDigest: boolean;
  connectionExpiry: boolean;
  assistantDone: boolean;
  weeklyReport: boolean;
}

export interface Settings {
  general: { name: string; timezone: string; language: string; weekStart: "monday" | "sunday"; retentionDays: number };
  members: Member[];
  apiKeys: ApiKey[];
  notifications: NotificationPrefs;
}

export interface FlowVersion {
  id: string;
  number: number;
  /** "Live", "Draft" or empty. */
  label: string;
  note: string;
  author: Person;
  at: number;
  published: boolean;
  changes: { added: number; changed: number; removed: number };
}
