/**
 * Dummy API: admin and system: the admin shell, overview, branding, audit, health, access.
 */
import { LATENCY_MS, clone, consoleError, logAudit, nextId, save, store, wait } from "../core.js";

function commercialOnly() {
  const error = new Error("Per-tenant branding requires Commercial.");
  error.code = "requires_commercial";
  return error;
}

/** Tenant, plan and the worst service state, for the admin shell. */
export async function getAdminContext() {
  await wait(LATENCY_MS.read);
  const { tenant, services } = store.admin;
  const worst = services.some((item) => item.state === "err") ? "err" : services.some((item) => item.state === "warn") ? "warn" : "ok";
  return clone({ tenant, health: worst });
}

export async function getAdminOverview() {
  await wait(LATENCY_MS.read);
  const { overview, services } = store.admin;
  return clone({ ...overview, reachability: services.filter((item) => item.reach) });
}

export async function getBranding() {
  await wait(LATENCY_MS.read);
  return clone({ ...store.admin.branding, plan: store.admin.tenant.plan });
}

export async function saveBranding(kit) {
  await wait(LATENCY_MS.write);
  if (store.admin.tenant.plan !== "commercial") throw commercialOnly();
  store.admin.branding = { ...store.admin.branding, ...kit };
  save();
  return clone(store.admin.branding);
}

export async function listAudit(query = {}) {
  await wait(LATENCY_MS.read);
  const days = query.days ?? store.admin.auditRetentionDays;
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const all = store.admin.audit;
  const events = all
    .filter((item) => item.at >= since)
    .filter((item) => !query.actor || item.actor.name === query.actor)
    .filter((item) => !query.actorClass || item.actor.class === query.actorClass)
    .filter((item) => !query.action || item.kind === query.action)
    .filter((item) => !query.objectType || item.object.type === query.objectType)
    .sort((a, b) => b.at - a.at);
  return clone({
    events,
    retentionDays: store.admin.auditRetentionDays,
    actors: [...new Set(all.map((item) => item.actor.name))],
    actions: [...new Set(all.map((item) => item.kind))],
    objectTypes: [...new Set(all.map((item) => item.object.type))],
  });
}

export async function getHealth() {
  await wait(LATENCY_MS.read);
  const { checks, uptime, log, services } = store.admin;
  return clone({ checks, uptime, log, services });
}

/**
 * Run every check again. In the sample, storage answers on the next check,
 * so "Check again" shows a recovery; the scheduler heartbeat stays late.
 */
export async function recheckHealth() {
  await wait(LATENCY_MS.write + 300);
  const now = Date.now();
  const { admin } = store;
  for (const check of admin.checks) check.checkedAt = now;
  const storage = admin.checks.find((item) => item.id === "storage");
  if (storage && storage.state === "err") {
    storage.state = "ok";
    storage.summary = "answering";
    storage.detail = { lastGood: now };
    const service = admin.services.find((item) => item.id === "storage");
    if (service) service.state = "ok";
    admin.log.unshift({ at: now, source: "storage", tone: "ok", message: "answering again" });
    const days = admin.uptime.find((item) => item.service === "Storage")?.days;
    if (days) days[days.length - 1] = "warn";
  }
  save();
  return clone({ checks: admin.checks, uptime: admin.uptime, log: admin.log, services: admin.services });
}

export async function pauseSchedules() {
  await wait(LATENCY_MS.write);
  const scheduled = store.flows.filter((flow) => flow.trigger.kind !== "webhook" && flow.status !== "draft");
  for (const schedule of store.console.schedules) schedule.enabled = false;
  store.admin.audit.unshift({
    id: nextId("e"),
    kind: "paused",
    group: "control",
    title: "All schedules paused",
    object: { name: `${scheduled.length} schedules`, type: "schedule" },
    actor: { name: "You", class: "person" },
    onBehalfOf: null,
    at: Date.now(),
  });
  save();
  return { paused: scheduled.length };
}

export async function drainWorker(workerId) {
  await wait(LATENCY_MS.write);
  const pool = store.console.workers;
  const target = (workerId && pool.find((item) => item.id === workerId)) || [...pool].reverse().find((item) => item.state !== "draining");
  if (!target) throw consoleError("no_worker", "Every worker is already draining.");
  if (pool.filter((item) => item.state !== "draining").length <= 1) throw consoleError("last_worker", "The last running worker cannot be drained.");
  target.state = "draining";
  target.inFlight = 0;
  const workers = store.admin.checks.find((item) => item.id === "workers");
  if (workers) workers.detail.alive = pool.filter((item) => item.state !== "draining").length;
  logAudit("paused", "control", "Worker drained", { name: target.id, type: "worker" });
  save();
  return clone({ worker: target.id, remaining: pool.filter((item) => item.state !== "draining").length });
}

export async function getAccessDenial() {
  await wait(LATENCY_MS.read);
  return clone({ ...store.admin.denied, yourRole: store.admin.you.role });
}

export async function requestAccess(role) {
  await wait(LATENCY_MS.write);
  store.sequence += 1;
  save();
  return { role, reference: `AR-${store.sequence.toString(16).toUpperCase()}` };
}
