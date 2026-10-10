import { api } from "../../api/client";
import { XWFlowRail } from "../../components/XWFlowRail/XWFlowRail";
import type { RailItem, XWFlowRailData } from "../../components/XWFlowRail/XWFlowRail.types";
import { catalog } from "../../content/catalog";
import type { AdminContext } from "../../types/domain";
import { el } from "../dom";
import { MountScope } from "../mount";
import { href, paths, type Route } from "../router";
import { siteHref } from "../site-links";
import type { Shell } from "./studio";

const words = catalog.admin.rail;

type Target = (typeof words.admin)[number]["target"] | (typeof words.system)[number]["target"];

const targets: Record<Target, string> = {
  admin: href(paths.admin),
  branding: href(paths.branding),
  audit: href(paths.audit),
  health: href(paths.health),
  denied: href(paths.denied),
  connections: href(paths.connections),
  runs: href(paths.runs),
  integrations: siteHref("integrations"),
  migrate: siteHref("landing", "migrate"),
};

function selection(route: Route): string {
  if (route.zone === "admin") return route.page;
  if (route.zone === "system") return "health";
  if (route.zone === "denied") return "quotas";
  return "";
}

function railData(context: AdminContext, route: Route): XWFlowRailData {
  const item = (entry: { id: string; label: string; icon: string; target: Target }): RailItem => ({
    id: entry.id,
    label: entry.label,
    icon: entry.icon,
    href: targets[entry.target],
    status:
      entry.id === "health" && context.health !== "ok"
        ? { tone: context.health === "err" ? "err" : "warn", label: context.health === "err" ? words.healthFailing : words.healthWarning }
        : undefined,
  });
  return {
    brand: { label: catalog.brand, href: href(paths.home) },
    headTag: { label: words.tag, color: "violet" },
    labels: { nav: words.label, collapse: catalog.studio.rail.collapse, expand: catalog.studio.rail.expand },
    sections: [
      { id: "admin", title: words.groups.admin, items: words.admin.map(item) },
      { id: "system", title: words.groups.system, items: words.system.map(item) },
    ],
    footer: [{ id: "back", label: words.back, href: href(paths.studio), icon: "arrow-left" }],
    usage: null,
    selected: selection(route),
  };
}

/** The admin and system zones: a slim rail with a health signal, a header and the page. */
export async function mountAdminShell(root: HTMLElement, route: Route): Promise<Shell> {
  const scope = new MountScope();
  const context = await api.getAdminContext();
  const frame = el("div", "xwflow-studio");
  const railHost = el("aside", "xwflow-studio__rail");
  const main = el("div", "xwflow-studio__main");
  const header = el("div", "xwflow-studio__header");
  const body = el("main", "xwflow-studio__body");
  main.append(header, body);
  frame.append(railHost, main);
  root.replaceChildren(frame);
  const rail = scope.track(new XWFlowRail(railHost, railData(context, route), { slim: true }));
  return {
    header,
    body,
    update(next) {
      rail.select(selection(next));
    },
    destroy() {
      scope.destroy();
    },
  };
}
