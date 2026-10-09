 

const STORE_KEY = "xwflow.dummy.v1";
const LATENCY_MS = { read: 220, write: 480 };

const workspace = {
  organization: "Northwind Operations",
  actor: "Amina Rahman",
};

const defaults = {
  stepName: "New step",
  stepKind: "task",
  stepSummary: "",
  succeededNote: "Completed.",
  runningNote: "In progress.",
  pendingNote: "Waiting.",
};

const stepTimingMs = 900;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function seed() {
  const invoiceDraft = [
    step("receive", "Receive invoice", "trigger", "A supplier invoice arrives with a purchase order."),
    step("budget", "Check budget", "task", "Confirm the cost centre can cover the amount."),
    step("decide", "Manager decision", "decision", "Approve, send back, or reject."),
    step("settle", "Record the outcome", "end", "Write the decision onto the invoice."),
  ];
  const invoiceV1 = invoiceDraft.slice(0, 3).map(copyStep);
  const hireDraft = [
    step("offer", "Offer accepted", "trigger", "The candidate accepts the offer."),
    step("accounts", "Provision accounts", "task", "Create mail, payroll, and building access."),
    step("equipment", "Issue equipment", "task", "Laptop and badge are assigned."),
    step("orient", "Orientation", "end", "The manager confirms the first week plan."),
  ];
  const incidentDraft = [
    step("detect", "Detect", "trigger", "Monitoring or a person reports the incident."),
    step("triage", "Triage", "task", "Severity and the owning team are set."),
    step("tell", "Communicate", "end", "Stakeholders receive the status."),
  ];

  const processes = [
    {
      id: "proc_invoice",
      name: "Invoice approval",
      description: "Check a supplier invoice and record an approval decision.",
      owner: "Finance",
      updatedAt: "2026-10-02T09:30:00.000Z",
      draft: invoiceDraft,
      versions: [
        version("ver_invoice_1", 1, "2026-09-12T08:00:00.000Z", "First published path, without the outcome record.", invoiceV1),
        version("ver_invoice_2", 2, "2026-10-02T09:30:00.000Z", "Adds the step that writes the decision back.", invoiceDraft.map(copyStep)),
      ],
    },
    {
      id: "proc_hire",
      name: "New hire onboarding",
      description: "Take an accepted offer through to the first day.",
      owner: "People",
      updatedAt: "2026-10-08T11:00:00.000Z",
      draft: hireDraft,
      versions: [
        version("ver_hire_1", 1, "2026-10-08T11:00:00.000Z", "Initial onboarding path.", hireDraft.map(copyStep)),
      ],
    },
    {
      id: "proc_incident",
      name: "Incident response",
      description: "Triage an operational incident and tell the people who need to know.",
      owner: "Operations",
      updatedAt: "2026-10-09T07:15:00.000Z",
      draft: incidentDraft,
      versions: [],
    },
  ];

  const runs = [
    frozenRun({
      id: "run_invoice_ok",
      processId: "proc_invoice",
      versionNumber: 1,
      startedAt: "2026-09-18T10:00:00.000Z",
      startedBy: workspace.actor,
      outcome: "succeeded",
      steps: invoiceV1,
    }),
    frozenRun({
      id: "run_invoice_bad",
      processId: "proc_invoice",
      versionNumber: 2,
      startedAt: "2026-10-06T14:10:00.000Z",
      startedBy: workspace.actor,
      outcome: "failed",
      failAt: 2,
      failNote: "The cost centre was closed. The invoice was sent back.",
      steps: invoiceDraft,
    }),
    {
      mode: "live",
      id: "run_hire_live",
      processId: "proc_hire",
      versionNumber: 1,
      startedAt: new Date(Date.now() - stepTimingMs * 1.4).toISOString(),
      startedBy: workspace.actor,
      steps: hireDraft.map(copyStep),
    },
  ];

  return { processes, runs };
}

function step(id, name, kind, summary) {
  return { id: `step_${id}`, name, kind, summary };
}

function copyStep(item) {
  return { id: item.id, name: item.name, kind: item.kind, summary: item.summary };
}

function version(id, number, publishedAt, note, steps) {
  return { id, number, publishedAt, note, steps: steps.map(copyStep) };
}

function frozenRun({ id, processId, versionNumber, startedAt, startedBy, outcome, steps, failAt, failNote }) {
  const start = Date.parse(startedAt);
  const recorded = steps.map((item, index) => {
    const stepStart = new Date(start + index * stepTimingMs).toISOString();
    const stepEnd = new Date(start + (index + 1) * stepTimingMs).toISOString();
    if (outcome === "failed" && index > failAt) {
      return recordStep(item, "skipped", null, null, defaults.pendingNote);
    }
    if (outcome === "failed" && index === failAt) {
      return recordStep(item, "failed", stepStart, stepEnd, failNote);
    }
    return recordStep(item, "succeeded", stepStart, stepEnd, defaults.succeededNote);
  });
  const finishedAt = outcome === "failed"
    ? recorded[failAt].finishedAt
    : recorded[recorded.length - 1].finishedAt;
  return {
    mode: "frozen",
    snapshot: {
      id,
      processId,
      versionNumber,
      status: outcome,
      startedAt,
      finishedAt,
      startedBy,
      steps: recorded,
    },
  };
}

function recordStep(item, status, startedAt, finishedAt, note) {
  return {
    id: item.id,
    name: item.name,
    kind: item.kind,
    status,
    startedAt,
    finishedAt,
    note,
  };
}

function load() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* a blocked storage is treated as a fresh workspace */
  }
  const state = seed();
  save(state);
  return state;
}

function save(state) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* the in-memory object still serves this page */
  }
}

function state() {
  if (!state.current) state.current = load();
  return state.current;
}

function processById(id) {
  const found = state().processes.find((item) => item.id === id);
  if (!found) throw new Error("Process not found.");
  return found;
}

function latestVersion(process) {
  return process.versions[process.versions.length - 1] ?? null;
}

function summarizeProcess(process) {
  const published = latestVersion(process);
  return {
    id: process.id,
    name: process.name,
    description: process.description,
    owner: process.owner,
    updatedAt: process.updatedAt,
    stepCount: process.draft.length,
    latestVersion: published ? published.number : null,
    state: published ? "published" : "draft",
    runCount: runCountFor(process.id),
  };
}

function runProcessId(record) {
  return record.mode === "frozen" ? record.snapshot.processId : record.processId;
}

function materialize(record, at = Date.now()) {
  if (record.mode === "frozen") return clone(record.snapshot);
  const elapsed = at - Date.parse(record.startedAt);
  const steps = record.steps.map((item, index) => {
    const start = index * stepTimingMs;
    const end = start + stepTimingMs;
    if (elapsed < start) return recordStep(item, "pending", null, null, defaults.pendingNote);
    const startedAt = new Date(Date.parse(record.startedAt) + start).toISOString();
    if (elapsed < end) return recordStep(item, "running", startedAt, null, defaults.runningNote);
    const finishedAt = new Date(Date.parse(record.startedAt) + end).toISOString();
    return recordStep(item, "succeeded", startedAt, finishedAt, defaults.succeededNote);
  });
  const statuses = steps.map((item) => item.status);
  let status = "running";
  if (statuses.every((item) => item === "pending")) status = "queued";
  if (statuses.every((item) => item === "succeeded")) status = "succeeded";
  const finishedAt = status === "succeeded" ? steps[steps.length - 1].finishedAt : null;
  return {
    id: record.id,
    processId: record.processId,
    versionNumber: record.versionNumber,
    status,
    startedAt: record.startedAt,
    finishedAt,
    startedBy: record.startedBy,
    steps,
  };
}

function summarizeRun(detail, processName) {
  return {
    id: detail.id,
    processId: detail.processId,
    processName,
    versionNumber: detail.versionNumber,
    status: detail.status,
    startedAt: detail.startedAt,
    finishedAt: detail.finishedAt,
    startedBy: detail.startedBy,
  };
}

function allRuns() {
  return state().runs.map((record) => {
    const detail = materialize(record);
    const process = state().processes.find((item) => item.id === detail.processId);
    return { detail, summary: summarizeRun(detail, process ? process.name : detail.processId) };
  });
}

function matches(haystack, query) {
  if (!query) return true;
  return haystack.toLowerCase().includes(query.trim().toLowerCase());
}

export async function getOverview() {
  await wait(LATENCY_MS.read);
  const processes = state().processes.map(summarizeProcess);
  const runs = allRuns()
    .map((item) => item.summary)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return {
    organization: workspace.organization,
    actor: workspace.actor,
    counts: {
      processes: processes.length,
      published: processes.filter((item) => item.state === "published").length,
      activeRuns: runs.filter((item) => item.status === "queued" || item.status === "running").length,
      failedRuns: runs.filter((item) => item.status === "failed").length,
    },
    recentRuns: runs.slice(0, 5),
    recentProcesses: processes.slice(0, 5),
  };
}

export async function listProcesses(query = {}) {
  await wait(LATENCY_MS.read);
  return state().processes
    .map(summarizeProcess)
    .filter((item) => matches(`${item.name} ${item.description}`, query.q))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProcess(id) {
  await wait(LATENCY_MS.read);
  const process = processById(id);
  return {
    id: process.id,
    name: process.name,
    description: process.description,
    owner: process.owner,
    updatedAt: process.updatedAt,
    draft: clone(process.draft),
    versions: clone(process.versions),
  };
}

export async function createProcess(input) {
  await wait(LATENCY_MS.write);
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("A process needs a name.");
  const process = {
    id: uid("proc"),
    name,
    description: String(input.description ?? "").trim(),
    owner: workspace.actor,
    updatedAt: nowIso(),
    draft: [],
    versions: [],
  };
  state().processes.unshift(process);
  save(state());
  return getProcess(process.id);
}

export async function addStep(processId) {
  await wait(LATENCY_MS.write);
  const process = processById(processId);
  process.draft.push({
    id: uid("step"),
    name: defaults.stepName,
    kind: defaults.stepKind,
    summary: defaults.stepSummary,
  });
  process.updatedAt = nowIso();
  save(state());
  return getProcess(processId);
}

export async function updateStep(processId, stepId, patch) {
  await wait(LATENCY_MS.write);
  const process = processById(processId);
  const current = process.draft.find((item) => item.id === stepId);
  if (!current) throw new Error("Step not found.");
  const name = String(patch.name ?? "").trim();
  if (!name) throw new Error("A step needs a name.");
  current.name = name;
  current.kind = patch.kind || current.kind;
  current.summary = String(patch.summary ?? "").trim();
  process.updatedAt = nowIso();
  save(state());
  return getProcess(processId);
}

export async function removeStep(processId, stepId) {
  await wait(LATENCY_MS.write);
  const process = processById(processId);
  const next = process.draft.filter((item) => item.id !== stepId);
  if (next.length === process.draft.length) throw new Error("Step not found.");
  process.draft = next;
  process.updatedAt = nowIso();
  save(state());
  return getProcess(processId);
}

export async function publishProcess(processId, input) {
  await wait(LATENCY_MS.write);
  const process = processById(processId);
  if (!process.draft.length) throw new Error("Add at least one step before publishing.");
  const note = String(input.note ?? "").trim();
  if (!note) throw new Error("A published version needs a note.");
  const previous = latestVersion(process);
  process.versions.push({
    id: uid("ver"),
    number: previous ? previous.number + 1 : 1,
    publishedAt: nowIso(),
    note,
    steps: process.draft.map(copyStep),
  });
  process.updatedAt = nowIso();
  save(state());
  return getProcess(processId);
}

export async function listRuns(query = {}) {
  await wait(LATENCY_MS.read);
  return allRuns()
    .map((item) => item.summary)
    .filter((item) => (query.processId ? item.processId === query.processId : true))
    .filter((item) => (query.status ? item.status === query.status : true))
    .filter((item) => matches(`${item.id} ${item.processName}`, query.q))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function getRun(id) {
  await wait(LATENCY_MS.read);
  const found = allRuns().find((item) => item.detail.id === id);
  if (!found) throw new Error("Run not found.");
  return { ...found.detail, processName: found.summary.processName };
}

export async function startRun(processId) {
  await wait(LATENCY_MS.write);
  const process = processById(processId);
  const published = latestVersion(process);
  if (!published) throw new Error("Publish a version before starting a run.");
  const record = {
    mode: "live",
    id: uid("run"),
    processId,
    versionNumber: published.number,
    startedAt: nowIso(),
    startedBy: workspace.actor,
    steps: published.steps.map(copyStep),
  };
  state().runs.unshift(record);
  save(state());
  return getRun(record.id);
}

export async function askAssistant(request) {
  await wait(LATENCY_MS.write);
  const process = processById(request.processId);
  const instruction = String(request.instruction ?? "").trim();
  if (!instruction) throw new Error("Ask a question first.");
  const runs = allRuns()
    .filter((item) => item.summary.processId === process.id)
    .map((item) => item.summary);
  const published = latestVersion(process);
  const text = replyFor(instruction, process, published, runs);
  return { text };
}

function replyFor(instruction, process, published, runs) {
  const lowered = instruction.toLowerCase();
  const draftNames = process.draft.map((item) => item.name).join(", ");
  const active = runs.filter((item) => item.status === "running" || item.status === "queued");
  const failed = runs.filter((item) => item.status === "failed");

  if (lowered.includes("publish")) {
    if (!process.draft.length) return `${process.name} has an empty draft, so there is nothing to publish.`;
    if (!published) {
      return `${process.name} is still a draft with ${process.draft.length} steps (${draftNames}). Publishing will freeze this sequence as version 1. Later draft edits will not change that version.`;
    }
    return `${process.name} is already published as version ${published.number}. Publishing again freezes the current draft as version ${published.number + 1}. The note should say what changed since “${published.note}”.`;
  }

  if (lowered.includes("fail") || lowered.includes("error")) {
    if (!failed.length) return `${process.name} has no failed runs.`;
    const latest = failed[0];
    return `The latest failed run is ${latest.id} on version ${latest.versionNumber}. Open that run for the step that stopped it. The published version itself is unchanged.`;
  }

  if (lowered.includes("run") || lowered.includes("next")) {
    if (!published) return `Publish ${process.name} before starting a run. A run always executes a published version, never the live draft.`;
    if (active.length) return `${active.length} run(s) of ${process.name} are still in progress, on version ${published.number}. The record fills in one step at a time.`;
    return `The runnable definition is version ${published.number} (${published.steps.length} steps). Starting a run copies those steps into a new record. Editing the draft afterwards will not rewrite it.`;
  }

  const versionText = published
    ? `Version ${published.number} is the one a new run will use.`
    : "No version has been published, so it cannot be run yet.";
  return `${process.name}: ${process.description} The draft is ${draftNames || "empty"}. ${versionText} ${runs.length} run(s) are on record.`;
}

function runCountFor(processId) {
  return state().runs.filter((item) => runProcessId(item) === processId).length;
}
