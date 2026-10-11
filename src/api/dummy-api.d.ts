import type {
  Adapter,
  AiCall,
  AiPolicy,
  ConfigEntry,
  CredentialFinding,
  CredentialPolicy,
  Execution,
  ImportRecord,
  RegistryNode,
  Schedule,
  Tenant,
  TenantPlan,
  TenantQuery,
  TenantStatus,
  Usage,
  Worker,
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
  FlowView,
  AccessDenial,
  AdminContext,
  AdminOverview,
  AuditList,
  AuditQuery,
  BrandKit,
  Health,
  NodeType,
  NotationFamily,
  NotationGallery,
  Pricing,
  SelfHost,
  StepGroup,
  Agent,
  AgentList,
  AgentStatus,
  DataTable,
  DataTableSummary,
  FormStatus,
  McpServer,
  ProjectForm,
  ProjectVariable,
  VariableScope,
  ApiKey,
  FlowVersion,
  Insights,
  Member,
  MemberRole,
  NotificationPrefs,
  Overview,
  Settings,
  TemplateList,
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

export function getAdminContext(): Promise<AdminContext>;
export function getAdminOverview(): Promise<AdminOverview>;
export function getBranding(): Promise<BrandKit>;
export function saveBranding(kit: Partial<Omit<BrandKit, "plan" | "swatches" | "typefaces">>): Promise<BrandKit>;
export function listAudit(query?: AuditQuery): Promise<AuditList>;
export function getHealth(): Promise<Health>;
export function recheckHealth(): Promise<Health>;
export function pauseSchedules(): Promise<{ paused: number }>;
export function drainWorker(workerId?: string): Promise<{ worker: string; remaining: number }>;
export function getAccessDenial(): Promise<AccessDenial>;
export function requestAccess(role: string): Promise<{ role: string; reference: string }>;

export function listTenants(query?: TenantQuery): Promise<{ tenants: Tenant[]; total: number }>;
export function addTenant(input: { name: string; plan: TenantPlan; region: string }): Promise<Tenant>;
export function setTenantStatus(tenantId: string, status: TenantStatus): Promise<Tenant>;
export function getCredentialPolicy(): Promise<{ policy: CredentialPolicy; findings: CredentialFinding[] }>;
export function saveCredentialPolicy(policy: Partial<CredentialPolicy>): Promise<CredentialPolicy>;
export function listNodeRegistry(query?: { q?: string; group?: StepGroup | "" }): Promise<{ nodes: RegistryNode[] }>;
export function setNodeEnabled(typeId: string, enabled: boolean): Promise<{ id: string; enabled: boolean }>;
export function listAdapters(): Promise<{ adapters: Adapter[]; imports: ImportRecord[] }>;
export function runImport(adapterId: string): Promise<ImportRecord>;
export function getUsage(): Promise<Usage>;
export function getAiGovernance(): Promise<{ policy: AiPolicy; calls: AiCall[] }>;
export function saveAiPolicy(patch: Partial<AiPolicy>): Promise<AiPolicy>;
export function listSchedules(): Promise<{ schedules: Schedule[] }>;
export function setScheduleEnabled(flowId: string, enabled: boolean): Promise<Omit<Schedule, "flowName">>;
export function listWorkers(): Promise<{ workers: Worker[] }>;
export function resumeWorker(workerId: string): Promise<Worker>;
export function listExecutions(query?: { q?: string; tenant?: string; status?: RunStatus | "" }): Promise<{ runs: Execution[]; tenants: string[] }>;
export function getConfig(): Promise<{ entries: ConfigEntry[] }>;
export function saveConfig(values: Record<string, string | number>): Promise<{ entries: ConfigEntry[] }>;

export function getFlowView(flowId: string): Promise<FlowView>;

export function listAgents(query?: { q?: string; status?: AgentStatus | "" }): Promise<AgentList>;
export function setAgentStatus(agentId: string, status: AgentStatus): Promise<Agent>;
export function createAgent(input: { name: string; description?: string }): Promise<Agent>;
export function listTables(): Promise<DataTableSummary[]>;
export function getTable(tableId: string): Promise<DataTable>;
export function listForms(): Promise<ProjectForm[]>;
export function setFormStatus(formId: string, status: FormStatus): Promise<ProjectForm>;
export function listVariables(query?: { scope?: VariableScope | ""; q?: string }): Promise<ProjectVariable[]>;
export function addVariable(input: { key: string; value: string; secret?: boolean; scope?: VariableScope }): Promise<ProjectVariable>;
export function deleteVariable(variableId: string): Promise<{ deleted: string }>;
export function listMcpServers(): Promise<McpServer[]>;
export function setMcpServerEnabled(serverId: string, enabled: boolean): Promise<McpServer>;
export function addMcpServer(input: { name: string; url: string }): Promise<McpServer>;
export function getOverview(): Promise<Overview>;
export function listTemplates(query?: { q?: string; category?: string }): Promise<TemplateList>;
export function useTemplate(templateId: string): Promise<FlowSummary>;
export function getInsights(query?: { days?: 7 | 14 }): Promise<Insights>;
export function getSettings(): Promise<Settings>;
export function saveGeneral(patch: Partial<Settings["general"]>): Promise<Settings["general"]>;
export function inviteMember(input: { email: string; role?: Exclude<MemberRole, "owner"> }): Promise<Member>;
export function setMemberRole(memberId: string, role: Exclude<MemberRole, "owner">): Promise<Member>;
export function removeMember(memberId: string): Promise<{ removed: string }>;
export function createApiKey(input: { name: string; scopes?: string[] }): Promise<{ key: ApiKey; token: string }>;
export function revokeApiKey(keyId: string): Promise<{ revoked: string }>;
export function setNotification(name: keyof NotificationPrefs, enabled: boolean): Promise<NotificationPrefs>;
export function listVersions(flowId: string): Promise<{ flow: FlowSummary; versions: FlowVersion[] }>;
export function restoreVersion(flowId: string, versionId: string): Promise<FlowVersion>;
