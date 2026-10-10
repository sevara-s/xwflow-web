import { api } from "../api/client";
import { catalog } from "../content/catalog";
import type { Workspace } from "../types/domain";
import { XWUIEmpty, XWUIProgressSpinner } from "../xwui";
import { el } from "./dom";
import { MountScope } from "./mount";
import { mountToaster } from "./notify";
import type { PageContext, PageRenderer } from "./page";
import { href, parseLocation, paths, type Route } from "./router";
import { mountBareShell } from "./shells/bare";
import { mountSiteShell } from "./shells/site";
import { mountStudioShell, type Shell } from "./shells/studio";

type PageModule = { render: PageRenderer<never> };

/** Pages load on demand, one chunk each. */
const pages: Record<string, () => Promise<PageModule>> = {
  "studio/assistant": () => import("../pages/studio/assistant"),
  "studio/flows": () => import("../pages/studio/flows"),
  "studio/runs": () => import("../pages/studio/runs"),
  "studio/run": () => import("../pages/studio/run"),
  "studio/connections": () => import("../pages/studio/connections"),
  "editor/editor": () => import("../pages/studio/editor"),
  "site/landing": () => import("../pages/site/landing"),
  "site/integrations": () => import("../pages/site/integrations"),
  "site/pricing": () => import("../pages/site/pricing"),
  "site/selfHost": () => import("../pages/site/self-host"),
  "site/notations": () => import("../pages/site/notations"),
};

type ShellKind = "studio" | "site" | "bare";

function shellKind(route: Route): ShellKind {
  if (route.zone === "studio") return "studio";
  if (route.zone === "site") return "site";
  return "bare";
}

export async function mountApplication(root: HTMLElement): Promise<void> {
  const toastHost = el("div", "xwflow-toasts");
  document.body.append(toastHost);
  mountToaster(toastHost);

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

    const nextKind = shellKind(route);
    if (!shell || kind !== nextKind) {
      pageScope.destroy();
      shell?.destroy();
      shell =
        nextKind === "studio" ? mountStudioShell(root, workspace, route) : nextKind === "site" ? mountSiteShell(root, route) : mountBareShell(root);
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

    const loader = pages[`${route.zone}/${route.page}`];
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
