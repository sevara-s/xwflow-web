/**
 * Dummy API core: the session store, simulated latency and failures, ids,
 * matching, errors and the audit trail every module shares.
 */
import { seedAdmin } from "./data/admin.js";
import { seedConsole } from "./data/console.js";
import { seedProject } from "./data/project.js";
import { seedStudio } from "./data/studio.js";
import { seedWorkspace } from "./data/workspace.js";

export const STORE_KEY = "xwflow.dummy.v4";
export const GROUP_ORDER = ["trigger", "control", "data", "ai", "integration"];
/**
 * How the stand-in network behaves. By default a token delay keeps every call
 * asynchronous, as a real API's would (15 ms to read, 40 ms to write), and
 * nothing fails. The address can ask for more (see settingsFromQuery), and
 * tests set it directly with configureApi.
 */
const settings = { readMs: 15, writeMs: 40, failureRate: 0 };

/** Named latencies for ?api-latency=. */
const LATENCY_PRESETS = { none: [0, 0], fast: [15, 40], slow: [600, 1200] };

/**
 * Settings from an address query: ?api-latency=none|fast|slow and
 * ?api-failures=<0 to 1>, the share of writes that fail. Unknown values are
 * ignored.
 */
export function settingsFromQuery(search) {
  const query = new URLSearchParams(search);
  const out = {};
  const latency = LATENCY_PRESETS[query.get("api-latency") ?? ""];
  if (latency) [out.readMs, out.writeMs] = latency;
  const failures = Number(query.get("api-failures"));
  if (query.has("api-failures") && failures >= 0 && failures <= 1) out.failureRate = failures;
  return out;
}

/** Change how the stand-in network behaves; returns the settings now in force. */
export function configureApi(patch = {}) {
  Object.assign(settings, patch);
  return { ...settings };
}

configureApi(settingsFromQuery(globalThis.location?.search ?? ""));

/** Wait as a read would. */
export function read() {
  return wait(settings.readMs);
}

/**
 * Wait as a write would (plus `extraMs` for slower work), and fail at the
 * configured rate before anything changes, as a dropped request would.
 */
export async function write(extraMs = 0) {
  await wait(settings.writeMs + extraMs);
  if (settings.failureRate && Math.random() < settings.failureRate) {
    throw consoleError("unavailable", "The server did not answer. Nothing was changed; try again.");
  }
}
/** How long one step takes when the dummy engine plays a new run. */
export const STEP_MS = 650;
/** How long the seeded "running now" run keeps running after load. */
export const SEEDED_RUN_MS = 10 * 60_000;

export const store = load();
export const listeners = new Set();

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clone(value) {
  return structuredClone(value);
}

export function load() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      // A session saved before the project areas existed gets their sample data.
      stored.project ??= seedProject(stored.seededAt ?? Date.now());
      stored.extras ??= seedWorkspace(stored.seededAt ?? Date.now());
      stored.console ??= seedConsole(stored.seededAt ?? Date.now());
      return stored;
    }
  } catch {
    // Storage can be unavailable (private mode); fall back to a fresh seed.
  }
  const now = Date.now();
  const studio = seedStudio(now);
  for (const run of studio.runs) {
    if (run.status === "running") run.finishAt = now + SEEDED_RUN_MS;
  }
  return { seededAt: now, sequence: 0x7f3b, ...studio, project: seedProject(now), extras: seedWorkspace(now), admin: seedAdmin(now), console: seedConsole(now) };
}

export function save() {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Persistence is a convenience only.
  }
  for (const listener of listeners) listener();
}

export function notFound(kind, id) {
  const error = new Error(`${kind} ${id} was not found.`);
  error.code = "not_found";
  return error;
}

export function nextId(prefix) {
  store.sequence += 1;
  return `${prefix}_${store.sequence.toString(16)}`;
}

export function matches(text, q) {
  return !q || text.toLowerCase().includes(q.trim().toLowerCase());
}

export function consoleError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function logAudit(kind, group, title, object) {
  store.admin.audit.unshift({ id: nextId("e"), kind, group, title, object, actor: { name: "You", class: "person" }, onBehalfOf: null, at: Date.now() });
}

export function findIn(list, kind, id) {
  const item = list.find((entry) => entry.id === id);
  if (!item) throw notFound(kind, id);
  return item;
}

export function invalid(message) {
  const error = new Error(message);
  error.code = "invalid";
  return error;
}
