import type {
  AssistantDraft,
  AssistantHome,
  CanvasNode,
  Connection,
  ConnectionQuery,
  FlowDetail,
  FlowList,
  FlowQuery,
  FlowSummary,
  PaletteGroup,
  RunDetail,
  RunList,
  RunMode,
  RunQuery,
  RunSummary,
  StepDetail,
  Workspace,
  Landing,
  NodeType,
  NotationFamily,
  NotationGallery,
  Pricing,
  SelfHost,
  StepGroup,
} from "../types/domain";

export interface StepPatch {
  name?: string;
  state?: CanvasNode["state"];
  fields?: Record<string, string>;
  retry?: Partial<StepDetail["retry"]>;
}

export function subscribe(listener: () => void): () => void;
export function getWorkspace(): Promise<Workspace>;

export function listFlows(query?: FlowQuery): Promise<FlowList>;
export function getFlow(flowId: string): Promise<FlowDetail>;
export function createFlow(input: { name: string; folder: string }): Promise<FlowSummary>;
export function publishFlow(flowId: string): Promise<FlowSummary>;
export function updateStep(flowId: string, nodeId: string, patch: StepPatch): Promise<{ node: CanvasNode; detail: StepDetail }>;
export function addStep(flowId: string, item: PaletteGroup["items"][number]): Promise<CanvasNode>;
export function moveSteps(flowId: string, positions: Array<Pick<CanvasNode, "id" | "x" | "y">>): Promise<CanvasNode[]>;

export function listRuns(query?: RunQuery): Promise<RunList>;
export function getRun(runId: string): Promise<RunDetail>;
export function startRun(flowId: string, mode?: RunMode): Promise<RunSummary>;
export function retryRuns(runIds: string[]): Promise<RunSummary[]>;
export function deleteRuns(runIds: string[]): Promise<{ deleted: number }>;

export function listConnections(query?: ConnectionQuery): Promise<Connection[]>;
export function getConnectionNames(): Promise<Array<Pick<Connection, "id" | "name" | "health">>>;
export function testConnection(connectionId: string): Promise<{ ok: boolean; latencyMs: number }>;
export function reconnectConnection(connectionId: string): Promise<Connection>;
export function addConnection(input: { name: string; auth: Connection["auth"]; audience: string }): Promise<Connection>;

export function getAssistantHome(): Promise<AssistantHome>;
export function draftFlow(prompt: string): Promise<AssistantDraft>;
export function saveDraft(draft: AssistantDraft): Promise<FlowSummary>;

export function getLanding(): Promise<Landing>;
export function listNodeTypes(query?: { q?: string; group?: StepGroup | "" }): Promise<{ items: NodeType[]; total: number }>;
export function getPricing(): Promise<Pricing>;
export function getSelfHost(): Promise<SelfHost>;
export function getNotations(query?: { family?: NotationFamily | "" }): Promise<NotationGallery>;
export function requestQuote(input: { email: string; need: string }): Promise<{ reference: string }>;
