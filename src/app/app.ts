import { api } from "../api/client";
import { catalog } from "../content/catalog";
import type { AdminContext, Workspace } from "../types/domain";
import type { Node } from "../ui/kit";
import { XWUIComposer, type XWUIToast } from "../xwui";
import { mountToaster } from "./notify";
import { href, parseLocation, paths, type Route } from "./router";
import { adminShell } from "./shells/admin-view";
import { siteShell } from "./shells/site-view";
import { studioShell } from "./shells/studio-view";
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
  "system/health": () => import("../pages/admin/health"),
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

export async function mountApplication(root: HTMLElement): Promise<void> {
  useTheme();
  // The whole screen is one XWUIComposer tree.
  const composer = new XWUIComposer(root, { tree: [toastNode] });
  let leave: Array<() => void> = [];
  let workspace: Workspace | null = null;
  let generation = 0;

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
    const frame = (page: Node[], bar?: PageBar): Node[] => [...shell(route, workspace!, page, bar, admin), toastNode];

    if (!loader) {
      composer.setTree(frame([notice("search", catalog.notFound.title, catalog.notFound.description)]));
      return;
    }
    composer.setTree(frame([{ tag: "xwui-spinner", data: { label: catalog.loading } }]));
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
      if (current !== generation) return;
      composer.setTree(frame(page.body, page.bar));
      window.scrollTo({ top: 0 });
      if (route.zone === "site" && route.section) {
        requestAnimationFrame(() => composer.getElementByKey(`band-${route.section}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    } catch (error) {
      if (current !== generation) return;
      const missing = (error as { code?: string }).code === "not_found";
      composer.setTree(frame([notice(missing ? "search" : "alert-triangle", missing ? catalog.errors.missing : catalog.errors.load, error instanceof Error ? error.message : "")]));
    }
  };

  window.addEventListener("hashchange", () => void show());
  await show();
}
