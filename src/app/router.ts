import type { ConnectionHealth, FlowStatus, RunMode, RunStatus } from "../types/domain";

export type NotationView = "flowchart" | "swimlane" | "bpmn" | "sequence" | "sim" | "3d";

export const notationViews: readonly NotationView[] = ["flowchart", "swimlane", "bpmn", "sequence", "sim", "3d"];

export type Route =
  | { zone: "site"; page: "landing" | "integrations" | "pricing" | "selfHost" | "notations"; section: string | null }
  | { zone: "studio"; page: "assistant" }
  | { zone: "studio"; page: "flows"; q: string; status: FlowStatus | ""; folder: string }
  | { zone: "studio"; page: "runs"; q: string; status: RunStatus | ""; mode: RunMode | ""; range: "7d" | "all" }
  | { zone: "studio"; page: "run"; runId: string; attempt: string | null }
  | { zone: "studio"; page: "connections"; q: string; health: ConnectionHealth | "" }
  | { zone: "editor"; page: "editor"; flowId: string; node: string | null }
  | { zone: "editor"; page: "view"; flowId: string; view: NotationView }
  | { zone: "admin"; page: "overview" | "branding" | "audit" }
  | { zone: "system"; page: "health" }
  | { zone: "denied"; page: "denied" }
  | { zone: "notFound"; page: "notFound"; path: string };

export const paths = {
  home: "/",
  integrations: "/integrations",
  pricing: "/pricing",
  selfHost: "/self-host",
  notations: "/notations",
  studio: "/studio",
  flows: "/studio/flows",
  runs: "/studio/runs",
  connections: "/studio/connections",
  admin: "/admin",
  branding: "/admin/branding",
  audit: "/admin/audit",
  health: "/system/health",
  denied: "/denied",
  flow: (flowId: string) => `/studio/flows/${encodeURIComponent(flowId)}`,
  flowView: (flowId: string, view: NotationView) => `/studio/flows/${encodeURIComponent(flowId)}/${view}`,
  run: (runId: string) => `/studio/runs/${encodeURIComponent(runId)}`,
};

/** A hash link: href("/studio/runs", { status: "failed" }) -> "#/studio/runs?status=failed". */
export function href(path: string, query?: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) if (value) params.set(key, value);
  const search = params.toString();
  return search ? `#${path}?${search}` : `#${path}`;
}

export function navigate(path: string, query?: Record<string, string | null | undefined>): void {
  const target = href(path, query);
  if (window.location.hash === target) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else window.location.hash = target;
}

/** Update the query of the current route without adding a history entry. */
export function replaceQuery(path: string, query: Record<string, string | null | undefined>): void {
  history.replaceState(null, "", href(path, query));
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | "" {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

const sitePages: Record<string, Extract<Route, { zone: "site" }>["page"]> = {
  "": "landing",
  integrations: "integrations",
  pricing: "pricing",
  "self-host": "selfHost",
  notations: "notations",
};

export function parseLocation(hash = window.location.hash): Route {
  const raw = hash.replace(/^#/, "") || "/";
  const cut = raw.indexOf("?");
  const path = cut === -1 ? raw : raw.slice(0, cut);
  const query = new URLSearchParams(cut === -1 ? "" : raw.slice(cut + 1));
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const [first = "", second, third] = parts;

  if (parts.length <= 1 && first in sitePages) {
    return { zone: "site", page: sitePages[first], section: query.get("section") };
  }
  if (first === "studio") {
    if (!second) return { zone: "studio", page: "assistant" };
    if (second === "flows" && !third) {
      return {
        zone: "studio",
        page: "flows",
        q: query.get("q") ?? "",
        status: oneOf(query.get("status"), ["published", "changed", "draft"] as const),
        folder: query.get("folder") ?? "",
      };
    }
    if (second === "flows" && third && parts.length === 3) {
      return { zone: "editor", page: "editor", flowId: third, node: query.get("node") };
    }
    if (second === "flows" && third && parts.length === 4) {
      const view = oneOf(parts[3], notationViews);
      if (view) return { zone: "editor", page: "view", flowId: third, view };
    }
    if (second === "runs" && !third) {
      return {
        zone: "studio",
        page: "runs",
        q: query.get("q") ?? "",
        status: oneOf(query.get("status"), ["running", "succeeded", "retried", "failed"] as const),
        mode: oneOf(query.get("mode"), ["production", "test", "retry", "replay"] as const),
        range: query.get("range") === "all" ? "all" : "7d",
      };
    }
    if (second === "runs" && third) return { zone: "studio", page: "run", runId: third, attempt: query.get("attempt") };
    if (second === "connections") {
      return {
        zone: "studio",
        page: "connections",
        q: query.get("q") ?? "",
        health: oneOf(query.get("health"), ["healthy", "expiring", "broken"] as const),
      };
    }
  }
  if (first === "admin" && parts.length <= 2) {
    if (!second) return { zone: "admin", page: "overview" };
    if (second === "branding" || second === "audit") return { zone: "admin", page: second };
  }
  if (first === "system" && second === "health") return { zone: "system", page: "health" };
  if (first === "denied") return { zone: "denied", page: "denied" };
  return { zone: "notFound", page: "notFound", path };
}
