import { api } from "../api/client";
import { catalog } from "../content/catalog";
import type { Workspace } from "../types/domain";
import type { Node } from "../ui/kit";
import { XWUIComposer, XWUIEmpty, XWUIProgressSpinner, type XWUIToast } from "../xwui";
import { el } from "./dom";
import { MountScope } from "./mount";
import { mountToaster } from "./notify";
import type { PageContext, PageRenderer } from "./page";
import { href, parseLocation, paths, type Route } from "./router";
import { mountAdminShell } from "./shells/admin";
import { mountBareShell } from "./shells/bare";
import { mountSiteShell } from "./shells/site";
import { siteShell } from "./shells/site-view";
import { studioShell } from "./shells/studio-view";
import type { PageBar, PageResult, PageView, ViewContext } from "./view";
import { mountStudioShell, type Shell } from "./shells/studio";

/** A page either composes XWUI nodes (`view`) or, until it moves, renders into the legacy shell. */
type PageModule = { render?: PageRenderer<never>; view?: PageView<never> };

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

type ShellKind = "studio" | "site" | "admin" | "bare";

function shellKind(route: Route): ShellKind {
  if (route.zone === "studio") return "studio";
  if (route.zone === "site") return "site";
  if (route.zone === "admin" || route.zone === "system" || route.zone === "denied") return "admin";
  return "bare";
}

/** The shell a composed page sits in. */
function composedShell(route: Route, workspace: Workspace, page: Node[], bar?: PageBar): Node[] {
  if (route.zone === "site") return siteShell(route, page);
  if (route.zone === "studio") return studioShell(workspace, route, page, bar);
  return page;
}

function pageResult(result: Node[] | PageResult): PageResult {
  return Array.isArray(result) ? { body: result } : result;
}

/**
 * Composed pages use the xwflow XWUI preset; pages not yet moved still use the
 * legacy app theme. The html carries the axes of whichever is on screen.
 */
const THEMES = {
  composed: { theme: "xwflow-neon", accent: "xwflow", font: "xwflow" },
  legacy: { theme: "dark", accent: "lime", font: "manrope" },
} as const;

function useTheme(mode: keyof typeof THEMES): void {
  const axes = THEMES[mode];
  const html = document.documentElement;
  html.dataset.theme = axes.theme;
  html.dataset.accent = axes.accent;
  html.dataset.font = axes.font;
}

const toastNode: Node = { tag: "xwui-toast", key: "toaster", ref: (instance) => mountToaster(instance as Pick<XWUIToast, "show">) };

export async function mountApplication(root: HTMLElement): Promise<void> {
  const toastHost = el("div", "xwflow-toasts");
  document.body.append(toastHost);
  mountToaster(toastHost);
  let composer: XWUIComposer | null = null;
  let leave: Array<() => void> = [];

  let workspace: Workspace | null = null;
  let shell: Shell | null = null;
  let kind: ShellKind | null = null;
  let pageScope = new MountScope();
  let generation = 0;

  const show = async (): Promise<void> => {
    const route = parseLocation();
    const current = ++generation;
    workspace ??= await api.getWorkspace();
    if (current !== generation) return;

    const loader = pages[`${route.zone}/${route.page}`];
    leave.splice(0).forEach((stop) => stop());
    const peek = loader ? await loader() : null;
    if (current !== generation) return;
    if (peek?.view) {
      // A composed page: the whole screen is one XWUIComposer tree.
      useTheme("composed");
      pageScope.destroy();
      shell?.destroy();
      shell = null;
      kind = null;
      if (!composer) {
        root.replaceChildren();
        composer = new XWUIComposer(root, { tree: [] });
      }
      const context: ViewContext = {
        route,
        workspace,
        refresh: () => void show(),
        instance: <T,>(key: string) => composer?.getInstanceByKey<T>(key),
        onLeave: (stop) => leave.push(stop),
      };
      composer.setTree(composedShell(route, workspace, [{ tag: "xwui-spinner", data: { label: catalog.loading } }]));
      try {
        const page = pageResult(await (peek.view as PageView)(context));
        if (current !== generation) return;
        composer.setTree([...composedShell(route, workspace, page.body, page.bar), toastNode]);
        window.scrollTo({ top: 0 });
        if (route.zone === "site" && route.section) {
          requestAnimationFrame(() => composer?.getElementByKey(`band-${route.section}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
        }
      } catch (error) {
        if (current !== generation) return;
        const missing = (error as { code?: string }).code === "not_found";
        composer.setTree(
          composedShell(route, workspace, [
            {
              tag: "xwui-empty",
              data: {
                icon: missing ? "search" : "alert-triangle",
                title: missing ? catalog.errors.missing : catalog.errors.load,
                description: error instanceof Error ? error.message : "",
              },
            },
          ]),
        );
      }
      return;
    }
    useTheme("legacy");
    if (composer) {
      composer.destroy();
      composer = null;
      root.replaceChildren();
    }

    const nextKind = shellKind(route);
    if (!shell || kind !== nextKind) {
      pageScope.destroy();
      shell?.destroy();
      shell =
        nextKind === "studio"
          ? mountStudioShell(root, workspace, route)
          : nextKind === "site"
            ? mountSiteShell(root, route)
            : nextKind === "admin"
              ? await mountAdminShell(root, route)
              : mountBareShell(root);
      if (current !== generation) return;
      kind = nextKind;
    } else {
      shell.update(route);
    }

    pageScope.destroy();
    pageScope = new MountScope();
    const scope = pageScope;
    const { header, body } = shell;
    header.replaceChildren();
    body.replaceChildren();
    window.scrollTo({ top: 0 });

    if (!loader) {
      scope.track(
        new XWUIEmpty(body, {
          icon: "search",
          title: catalog.notFound.title,
          description: catalog.notFound.description,
          action: { label: catalog.notFound.action, onClick: () => (window.location.hash = href(paths.flows)) },
        }),
      );
      return;
    }

    const pending = el("div", "xwflow-pending");
    body.append(pending);
    const spinner = new XWUIProgressSpinner(pending, { label: catalog.loading });
    const context: PageContext = { route, scope, header, body, workspace, refresh: () => void show() };
    try {
      const module = await loader();
      if (current !== generation) return;
      await (module.render as PageRenderer)(context);
    } catch (error) {
      if (current !== generation) return;
      body.replaceChildren();
      const missing = (error as { code?: string }).code === "not_found";
      scope.track(
        new XWUIEmpty(body, {
          icon: missing ? "search" : "alert-triangle",
          title: missing ? catalog.errors.missing : catalog.errors.load,
          description: error instanceof Error ? error.message : "",
          action: { label: catalog.notFound.action, onClick: () => (window.location.hash = href(paths.flows)) },
        }),
      );
    } finally {
      spinner.destroy();
      pending.remove();
    }
  };

  window.addEventListener("hashchange", () => void show());
  await show();
}
