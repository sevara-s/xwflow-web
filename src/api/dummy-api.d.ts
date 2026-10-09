import type {
  AssistantReply,
  AssistantRequest,
  CreateProcessInput,
  Overview,
  ProcessDetail,
  ProcessQuery,
  ProcessSummary,
  RunDetail,
  RunQuery,
  RunSummary,
  StepPatch,
} from "../types/domain";

export function getOverview(): Promise<Overview>;
export function listProcesses(query?: ProcessQuery): Promise<ProcessSummary[]>;
export function getProcess(id: string): Promise<ProcessDetail>;
export function createProcess(input: CreateProcessInput): Promise<ProcessDetail>;
export function addStep(processId: string): Promise<ProcessDetail>;
export function updateStep(processId: string, stepId: string, patch: StepPatch): Promise<ProcessDetail>;
export function removeStep(processId: string, stepId: string): Promise<ProcessDetail>;
export function publishProcess(processId: string, input: { note: string }): Promise<ProcessDetail>;
export function listRuns(query?: RunQuery): Promise<RunSummary[]>;
export function getRun(id: string): Promise<RunDetail>;
export function startRun(processId: string): Promise<RunDetail>;
export function askAssistant(request: AssistantRequest): Promise<AssistantReply>;
