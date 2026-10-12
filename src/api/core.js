/**
 * Dummy API: store, timing and shared helpers: the session store, simulated latency, ids, matching, errors.
 */
import { seedAdmin } from "./data/admin.js";
import { seedConsole } from "./data/console.js";
import { seedProject } from "./data/project.js";
import { seedStudio } from "./data/studio.js";
import { seedWorkspace } from "./data/workspace.js";

export const STORE_KEY = "xwflow.dummy.v4";
export const GROUP_ORDER = ["trigger", "control", "data", "ai", "integration"];
/**
 * A token delay so every call stays asynchronous, as a real API's would. It
 * was 180 ms per read and 420 ms per write, which made every page change wait
 * on purpose; the local stand-in has no network to simulate that well.
 */
export const LATENCY_MS = { read: 15, write: 40 };
/** How long one step takes when the dummy engine plays a new run. */
export const STEP_MS = 650;
/** How long the seeded "running now" run keeps running after load. */
export const SEEDED_RUN_MS = 10 * 60_000;

export let store = load();
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
