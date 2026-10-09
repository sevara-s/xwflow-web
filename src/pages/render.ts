import { catalog } from "../content/catalog";
import { XWUIAlert, XWUIEmpty, XWUIProgressSpinner } from "../xwui";
import { MountScope } from "../app/mount";
import { navigate, type Route } from "../app/router";
import { renderOverview } from "./overview";
import { renderPreview } from "./preview";
import { renderProcess } from "./process";
import { renderProcesses } from "./processes";
import { renderRun } from "./run";
import { renderRuns } from "./runs";

export async function renderPage(slot: HTMLElement, scope: MountScope, route: Route): Promise<void> {
  if (route.name === "landing") {
    const { renderLanding } = await import("./landing");
    slot.replaceChildren();
    renderLanding(slot, scope);
    return;
  }
  const pending = document.createElement("div");
  slot.append(pending);
  const spinner = scope.track(new XWUIProgressSpinner(pending, { label: catalog.loading }));
  try {
    if (route.name === "overview") await renderOverview(slot, scope);
    else if (route.name === "assistant" || route.name === "templates" || route.name === "insights" || route.name === "settings") {
      renderPreview(slot, route.name);
    }
    else if (route.name === "processes") await renderProcesses(slot, scope, route.q);
    else if (route.name === "process") await renderProcess(slot, scope, route.processId);
    else if (route.name === "runs") await renderRuns(slot, scope, route.q, route.status);
    else if (route.name === "run") await renderRun(slot, scope, route.runId);
    else {
      slot.replaceChildren();
      scope.track(
        new XWUIEmpty(slot, {
          icon: "search",
          title: catalog.notFound.title,
          description: catalog.notFound.description,
          action: {
            label: catalog.notFound.action,
            onClick: () => navigate(catalog.paths.overview),
          },
        }),
      );
    }
    spinner.destroy();
    pending.remove();
  } catch (error) {
    slot.replaceChildren();
    const message = error instanceof Error && error.message ? error.message : catalog.errors.load;
    const missing = message.toLowerCase().includes("not found");
    if (missing) {
      scope.track(
        new XWUIEmpty(slot, {
          icon: "search",
          title: catalog.errors.missing,
          description: message,
          action: { label: catalog.notFound.action, onClick: () => navigate(catalog.paths.overview) },
        }),
      );
    } else {
      scope.track(new XWUIAlert(slot, { message, variant: "danger" }));
    }
  }
}
