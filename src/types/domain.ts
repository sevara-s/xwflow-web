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
  id: string;
  label: string;
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
