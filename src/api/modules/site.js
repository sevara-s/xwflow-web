/**
 * Dummy API: the public website's data: landing, node types, pricing, self-host, notations, quotes.
 */
import { dialects, nodeTypes, notations, pricing, selfHost, tenants } from "../data/site.js";
import { LATENCY_MS, clone, matches, save, store, wait } from "../core.js";
import { findFlow, runDetail, walkOrder } from "../engine.js";

/** Everything the landing page shows, including the real sample flow and its receipt. */
export async function getLanding() {
  await wait(LATENCY_MS.read);
  const flow = findFlow("f_order_alert");
  const run = store.runs.find((item) => item.id === "r_7f39");
  return clone({
    stats: { connectors: nodeTypes.length, dialects: dialects.length, rowsPerAttempt: 1, vendorMarks: 0 },
    marquee: nodeTypes.map(({ id, label, group }) => ({ id, label, group })),
    flow: { id: flow.id, name: flow.name, graph: flow.graph },
    receipt: run ? runDetail(run) : null,
    tenants,
    notations: notations.map(({ id, name, family, view, concept }) => ({ id, name, family, view, concept })),
    dialects,
  });
}

export async function listNodeTypes(query = {}) {
  await wait(LATENCY_MS.read);
  const items = nodeTypes
    .filter((type) => !query.group || type.group === query.group)
    .filter((type) => matches(`${type.label} ${type.summary}`, query.q));
  return clone({ items, total: nodeTypes.length });
}

export async function getPricing() {
  await wait(LATENCY_MS.read);
  return clone(pricing);
}

export async function getSelfHost() {
  await wait(LATENCY_MS.read);
  return clone(selfHost);
}

/** The gallery, plus the sample flow every thumbnail draws so each notation shows the same flow. */
export async function getNotations(query = {}) {
  await wait(LATENCY_MS.read);
  const flow = findFlow("f_order_alert");
  const run = store.runs.find((item) => item.flowId === flow.id && item.attempts);
  return clone({
    items: notations.filter((item) => !query.family || item.family === query.family),
    total: notations.length,
    sample: {
      flowId: flow.id,
      runId: run ? run.id : null,
      steps: walkOrder(flow.graph).map(({ id, name, type, group }) => ({ id, name, type, group })),
    },
  });
}

/** The pricing contact form. The dummy API only validates and acknowledges. */
export async function requestQuote({ email, need }) {
  await wait(LATENCY_MS.write);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email ?? "")) {
    const error = new Error("Enter a work email address.");
    error.code = "invalid_email";
    throw error;
  }
  if (!need || !need.trim()) {
    const error = new Error("Say what you want to run.");
    error.code = "missing_need";
    throw error;
  }
  store.sequence += 1;
  save();
  return { reference: `Q-${store.sequence.toString(16).toUpperCase()}` };
}
