import { catalog } from "../content/catalog";
import type { RunStatus } from "../types/domain";

export type Route =
  | { name: "landing"; section: string | null }
  | { name: "overview" }
  | { name: "processes"; q: string }
  | { name: "process"; processId: string }
  | { name: "runs"; q: string; status: RunStatus | "" }
  | { name: "run"; runId: string }
  | { name: "assistant" }
  | { name: "templates" }
  | { name: "insights" }
  | { name: "settings" }
  | { name: "notFound"; path: string };

const studioPages = new Set(["assistant", "templates", "insights", "settings"]);

const runStatuses = new Set<RunStatus>(["queued", "running", "succeeded", "failed"]);
const landingSections = new Set<string>(catalog.landing.nav.map((item) => item.id));

export function href(path: string, query?: Record<string, string>): string {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
  }
  const search = params.toString();
  return search ? `#${path}?${search}` : `#${path}`;
}

export function processPath(processId: string): string {
  return `${catalog.paths.processes}/${encodeURIComponent(processId)}`;
}

export function runPath(runId: string): string {
  return `${catalog.paths.runs}/${encodeURIComponent(runId)}`;
}

export function parseLocation(hash = window.location.hash): Route {
  const raw = hash.replace(/^#/, "") || catalog.paths.home;
  const cut = raw.indexOf("?");
  const path = cut === -1 ? raw : raw.slice(0, cut);
  const query = new URLSearchParams(cut === -1 ? "" : raw.slice(cut + 1));
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0 || (parts.length === 1 && (parts[0] === "home" || parts[0] === "landing"))) {
    return { name: "landing", section: null };
  }
  if (parts.length === 1 && parts[0] && landingSections.has(parts[0])) {
    return { name: "landing", section: parts[0] };
  }
  if (parts.length === 1 && parts[0] === "overview") return { name: "overview" };
  if (parts.length === 1 && parts[0] === "processes") {
    return { name: "processes", q: query.get("q") ?? "" };
  }
  if (parts.length === 2 && parts[0] === "processes" && parts[1]) {
    return { name: "process", processId: decodeURIComponent(parts[1]) };
  }
  if (parts.length === 1 && parts[0] === "runs") {
    const status = query.get("status") ?? "";
    return {
      name: "runs",
      q: query.get("q") ?? "",
      status: runStatuses.has(status as RunStatus) ? (status as RunStatus) : "",
    };
  }
  if (parts.length === 2 && parts[0] === "runs" && parts[1]) {
    return { name: "run", runId: decodeURIComponent(parts[1]) };
  }
  if (parts.length === 1 && parts[0] && studioPages.has(parts[0])) {
    const name = parts[0];
    if (name === "assistant" || name === "templates" || name === "insights" || name === "settings") {
      return { name };
    }
  }
  return { name: "notFound", path };
}

export function routeIdentity(route: Route): string {
  switch (route.name) {
    case "landing":
      return "landing";
    case "process":
      return `process:${route.processId}`;
    case "run":
      return `run:${route.runId}`;
    case "notFound":
      return `missing:${route.path}`;
    default:
      return route.name;
  }
}

export function sectionId(route: Route): string {
  if (route.name === "landing") return "home";
  if (route.name === "process") return "processes";
  if (route.name === "run") return "runs";
  if (route.name === "notFound") return "overview";
  return route.name;
}

type QueryListener = (route: Route) => void;

const queryListeners = new Set<QueryListener>();

export function onQueryChange(listener: QueryListener, scope: { track(item: { destroy(): void }): void }): void {
  queryListeners.add(listener);
  scope.track({
    destroy() {
      queryListeners.delete(listener);
    },
  });
}

export function navigate(path: string, query?: Record<string, string>): void {
  const next = href(path, query);
  if (window.location.hash === next) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  window.location.hash = next;
}

export function replaceQuery(path: string, query?: Record<string, string>): void {
  const next = href(path, query);
  if (`${window.location.pathname}${window.location.search}${next}` === `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    return;
  }
  history.replaceState(null, "", next);
  for (const listener of queryListeners) listener(parseLocation());
}

export function startRouter(render: (route: Route) => void): void {
  let identity = "";
  const apply = () => {
    const route = parseLocation();
    const nextIdentity = routeIdentity(route);
    if (!window.location.hash) {
      history.replaceState(null, "", href(catalog.paths.home));
    }
    if (nextIdentity === identity) {
      for (const listener of queryListeners) listener(route);
      return;
    }
    identity = nextIdentity;
    render(route);
  };
  window.addEventListener("hashchange", apply);
  apply();
}
