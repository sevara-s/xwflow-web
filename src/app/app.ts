import { api } from "../api/client";
import { catalog } from "../content/catalog";
import type { AdminContext, Workspace } from "../types/domain";
import type { Node } from "../ui/kit";
import { XWUIComposer, type XWUIToast } from "../xwui";
import { mountToaster, notify } from "./notify";
import { href, parseLocation, paths, type Route } from "./router";
import { adminSelection, adminShell } from "./shells/admin-view";
import { currentNav, LANGUAGE_LINK, siteShell } from "./shells/site-view";
import { appBarData, appPage, railSelection, studioShell } from "./shells/studio-view";
import type { PageBar, PageResult, PageView, ViewContext } from "./view";

/** Every page composes XWUI nodes: it exports a view(). */
type PageModule = { view: PageView<never> };

/** Pages load on demand, one chunk each. */
const pages: Record<string, () => Promise<PageModule>> = {
  "studio/assistant": () => import("../pages/studio/assistant"),
  "studio/flows": () => import("../pages/studio/flows"),
  "studio/runs": () => import("../pages/studio/runs"),
  "studio/run": () => import("../pages/studio/run"),
  "studio/connections": () => import("../pages/studio/connections"),
  "studio/agents": () => import("../pages/studio/agents"),
  "studio/tables": () => import("../pages/studio/tables"),
  "studio/forms": () => import("../pages/studio/forms"),
  "studio/variables": () => import("../pages/studio/variables"),
  "studio/mcp": () => import("../pages/studio/mcp"),
  "studio/overview": () => import("../pages/studio/overview"),
  "studio/templates": () => import("../pages/studio/templates"),
  "studio/insights": () => import("../pages/studio/insights"),
  "studio/settings": () => import("../pages/studio/settings"),
  "studio/versions": () => import("../pages/studio/versions"),
  "editor/editor": () => import("../pages/studio/editor"),
  "editor/view": () => import("../pages/views/view"),
  "site/landing": () => import("../pages/site/landing"),
  "site/integrations": () => import("../pages/site/integrations"),
  "site/pricing": () => import("../pages/site/pricing"),
  "site/selfHost": () => import("../pages/site/self-host"),
  "site/notations": () => import("../pages/site/notations"),
  "admin/overview": () => import("../pages/admin/overview"),
  "admin/branding": () => import("../pages/admin/branding"),
  "admin/audit": () => import("../pages/admin/audit"),
  "admin/tenants": () => import("../pages/admin/tenants"),
  "admin/credentials": () => import("../pages/admin/credentials"),
  "admin/registry": () => import("../pages/admin/registry"),
  "admin/adapters": () => import("../pages/admin/adapters"),
  "admin/usage": () => import("../pages/admin/usage"),
  "admin/ai": () => import("../pages/admin/ai"),
  "system/health": () => import("../pages/admin/health"),
  "system/schedules": () => import("../pages/admin/schedules"),
  "system/workers": () => import("../pages/admin/workers"),
  "system/executions": () => import("../pages/admin/executions"),
  "system/config": () => import("../pages/admin/config"),
  "denied/denied": () => import("../pages/admin/denied"),
};

const isAdminZone = (route: Route): boolean => route.zone === "admin" || route.zone === "system" || route.zone === "denied";

/** The shell a page sits in: the website, the studio, the admin, or none (the editor and the views). */
function shell(route: Route, workspace: Workspace, page: Node[], bar?: PageBar, admin?: AdminContext | null): Node[] {
  if (route.zone === "site") return siteShell(route, page);
  if (route.zone === "studio") return studioShell(workspace, route, page, bar);
  if (admin && isAdminZone(route)) return adminShell(workspace, route, admin, page, bar);
  return page;
}

function pageResult(result: Node[] | PageResult): PageResult {
  return Array.isArray(result) ? { body: result } : result;
}

/** The whole app wears the xwflow XWUI preset: theme, accent and type axes on <html>. */
function useTheme(): void {
  const html = document.documentElement;
  html.dataset.theme = "xwflow-neon";
  html.dataset.accent = "xwflow";
  html.dataset.font = "xwflow";
}

/** The toaster rides along in every tree, so a notice can show on any screen. */
const toastNode: Node = { tag: "xwui-toast", key: "toaster", ref: (instance) => mountToaster(instance as Pick<XWUIToast, "show">) };

/** A full-page notice in place of the page: not found, or failed to load. */
function notice(icon: string, title: string, description: string): Node {
  return {
    tag: "xwui-empty",
    data: { icon, title, description, action: { label: catalog.notFound.action, onClick: () => (window.location.hash = href(paths.flows)) } },
  };
}

/** Which frame a route sits in; the frame is built once and kept while this stays the same. */
function frameKind(route: Route, admin: AdminContext | null): string {
  // Each site section gets a freshly built header: the published XWUIBarSiteHeader
  // adds a second copy of its actions on every setCurrentPath() (README, known issues).
  if (route.zone === "site") return `site:${currentNav(route)}`;
  if (route.zone === "studio") return "studio";
  if (admin && isAdminZone(route)) return `admin:${admin.health}`;
  return "bare";
}

/** Point a kept frame at the new route: the rail's selection, the header's link, the bar. */
function updateFrame(composer: XWUIComposer, route: Route, workspace: Workspace, bar: PageBar | undefined): void {
  const at = <T,>(key: string): T | undefined => composer.getInstanceByKey<T>(key);
  if (route.zone === "studio") at<{ select(id: string): void }>("studio-rail")?.select(railSelection(route));
  if (isAdminZone(route)) at<{ select(id: string): void }>("admin-rail")?.select(adminSelection(route));
  at<{ setData(data: object): void }>("app-bar")?.setData(appBarData(workspace, bar));
  at<XWUIComposer>("app-bar-actions")?.setTree(bar?.actions ?? []);
}

/** How long a page may take before its spinner shows; quicker pages never flash one. */
const SPINNER_DELAY_MS = 150;

export async function mountApplication(root: HTMLElement): Promise<void> {
  useTheme();
  // The whole screen is one XWUIComposer tree: the frame (rail, bar, header) and,
  // inside it, the page area - a nested composer, so a page change swaps only the page.
  const composer = new XWUIComposer(root, { tree: [toastNode] });
  const leave: Array<() => void> = [];
  let workspace: Workspace | null = null;
  let generation = 0;
  let mountedKind: string | null = null;
  const pageArea = (): XWUIComposer | undefined => composer.getInstanceByKey<XWUIComposer>("page");

  /** Show `body` in the page area, building the frame first when the route needs another one. */
  const place = (route: Route, admin: AdminContext | null, body: Node[], bar?: PageBar): void => {
    const kind = frameKind(route, admin);
    // In the studio and admin frames the page's items stack with the frame's gap.
    const tree = kind === "studio" || kind.startsWith("admin:") ? appPage(body) : body;
    if (kind !== mountedKind || !pageArea()) {
      composer.setTree([...shell(route, workspace!, [{ tag: "xwui-composer", key: "page", data: { tree } }], bar, admin), toastNode]);
      mountedKind = kind;
      return;
    }
    updateFrame(composer, route, workspace!, bar);
    pageArea()?.setTree(tree);
  };

  const show = async (): Promise<void> => {
    const route = parseLocation();
    const current = ++generation;
    workspace ??= await api.getWorkspace();
    if (current !== generation) return;
    leave.splice(0).forEach((stop) => stop());

    const loader = (pages as Partial<typeof pages>)[`${route.zone}/${route.page}`];
    // Admin pages and their rail read the tenant and the health signal, fresh on each visit.
    const admin = loader && isAdminZone(route) ? await api.getAdminContext() : null;
    if (current !== generation) return;

    if (!loader) {
      place(route, admin, [notice("search", catalog.notFound.title, catalog.notFound.description)]);
      return;
    }
    const spinner = setTimeout(() => {
      if (current === generation) place(route, admin, [{ tag: "xwui-spinner", data: { label: catalog.loading } }]);
    }, SPINNER_DELAY_MS);
    const context: ViewContext = {
      route,
      workspace,
      admin,
      refresh: () => void show(),
      instance: <T,>(key: string) => composer.getInstanceByKey<T>(key),
      onLeave: (stop) => leave.push(stop),
    };
    try {
      const module = await loader();
      const page = pageResult(await (module.view as PageView)(context));
      clearTimeout(spinner);
      if (current !== generation) return;
      place(route, admin, page.body, page.bar);
      window.scrollTo({ top: 0 });
      if (route.zone === "site" && route.section) {
        requestAnimationFrame(() => composer.getElementByKey(`band-${route.section}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    } catch (error) {
      clearTimeout(spinner);
      if (current !== generation) return;
      const missing = (error as { code?: string }).code === "not_found";
      place(route, admin, [notice(missing ? "search" : "alert-triangle", missing ? catalog.errors.missing : catalog.errors.load, error instanceof Error ? error.message : "")]);
    }
  };

  // The language link is not a page: it says the Arabic interface comes next and
  // leaves the address on the page the visitor was reading.
  let lastPage = window.location.hash === LANGUAGE_LINK ? href(paths.home) : window.location.hash;
  const onAddress = (): void => {
    if (window.location.hash === LANGUAGE_LINK) {
      window.history.replaceState(null, "", lastPage || href(paths.home));
      notify(catalog.site.footer.languageSoon, "info");
      return;
    }
    lastPage = window.location.hash;
    void show();
  };
  window.addEventListener("hashchange", onAddress);
  if (window.location.hash === LANGUAGE_LINK) window.history.replaceState(null, "", lastPage);
  await show();
  preloadPages();
}

/** Once the first page is up, fetch every other page's code while the browser is idle. */
function preloadPages(): void {
  const idle = (work: () => void): void => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(work, { timeout: 3000 });
    else setTimeout(work, 1200);
  };
  idle(() => {
    for (const load of Object.values(pages)) void load().catch(() => undefined);
  });
}
