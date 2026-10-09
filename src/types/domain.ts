export type StepKind = "trigger" | "task" | "decision" | "end";

export type ProcessState = "draft" | "published";

export type RunStatus = "queued" | "running" | "succeeded" | "failed";

export type StepStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";

export interface ProcessStep {
  id: string;
  name: string;
  kind: StepKind;
  summary: string;
}

export interface ProcessVersion {
  id: string;
  number: number;
  publishedAt: string;
  note: string;
  steps: ProcessStep[];
}

export interface ProcessSummary {
  id: string;
  name: string;
  description: string;
  owner: string;
  updatedAt: string;
  stepCount: number;
  latestVersion: number | null;
  state: ProcessState;
  runCount: number;
}

export interface ProcessDetail {
  id: string;
  name: string;
  description: string;
  owner: string;
  updatedAt: string;
  draft: ProcessStep[];
  versions: ProcessVersion[];
}

export interface RunStep {
  id: string;
  name: string;
  kind: StepKind;
  status: StepStatus;
  startedAt: string | null;
  finishedAt: string | null;
  note: string;
}

export interface RunSummary {
  id: string;
  processId: string;
  processName: string;
  versionNumber: number;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  startedBy: string;
}

export interface RunDetail extends RunSummary {
  steps: RunStep[];
}

export interface Overview {
  organization: string;
  actor: string;
  counts: {
    processes: number;
    published: number;
    activeRuns: number;
    failedRuns: number;
  };
  recentRuns: RunSummary[];
  recentProcesses: ProcessSummary[];
}

export interface ProcessQuery {
  q?: string;
}

export interface RunQuery {
  q?: string;
  status?: RunStatus | "";
  processId?: string;
}

export interface CreateProcessInput {
  name: string;
  description: string;
}

export interface StepPatch {
  name: string;
  kind: StepKind;
  summary: string;
}

export interface AssistantRequest {
  processId: string;
  instruction: string;
}

export interface AssistantReply {
  text: string;
}
