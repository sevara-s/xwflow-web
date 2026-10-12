import { catalog } from "../../content/catalog";
import type { AdminContext, Workspace } from "../../types/domain";
import type { Node } from "../../ui/kit";
import { breakpoints } from "../../ui/layout";
import { fill } from "../format";
import { href, paths, type AdminPage, type Route, type SystemPage } from "../router";
import type { PageBar } from "../view";
import { appFrame } from "./studio-view";
import { config } from "../../config";

const words = catalog.admin.rail;

type RailItem = { id: string; label: string; icon: string };

/** Where a rail item goes: its own admin or system page; Quotas opens the denied screen. */
function railHref(section: "admin" | "system", id: string): string {
  if (id === "quotas") return href(paths.denied);
  return href(section === "admin" ? paths.adminPage(id as AdminPage) : paths.systemPage(id as SystemPage));
}

export function adminSelection(route: Route): string {
  if (route.zone === "admin" || route.zone === "system") return route.page;
  if (route.zone === "denied") return "quotas";
  return "";
}

function rail(admin: AdminContext, route: Route): Node {
  const item = (section: "admin" | "system") => (entry: RailItem) => ({
    id: entry.id,
    label: entry.label,
    icon: entry.icon,
    href: railHref(section, entry.id),
    status:
      entry.id === "health" && admin.health !== "ok"
        ? { tone: admin.health === "err" ? "error" : "warning", label: admin.health === "err" ? words.healthFailing : words.healthWarning }
        : undefined,
  });
  return {
    tag: "xwui-app-rail",
    key: "admin-rail",
    // On a phone the rail starts closed: only its head bar shows until the toggle opens it.
    config: { slim: true, collapsed: window.matchMedia(breakpoints.tablet).matches },
    data: {
      selected: adminSelection(route),
      headTag: { label: words.tag, hue: "violet" },
      labels: { nav: words.label, collapse: catalog.studio.rail.collapse, expand: catalog.studio.rail.expand },
      sections: [
        { id: "admin", title: words.groups.admin, items: words.admin.map(item("admin")) },
        { id: "system", title: words.groups.system, items: words.system.map(item("system")) },
      ],
      footer: [{ id: "back", label: words.back, href: href(paths.studio), icon: "arrow-left" }],
      usage: null,
    },
    slots: {
      brand: {
        tag: "xwui-logo",
        data: {},
        config: { svgPath: config.logoPath, logoConfig: "logo-title", title: catalog.brand, size: "xxs", layout: "h", href: href(paths.home) },
      },
    },
  };
}

/** The admin and system zones: the slim admin rail with its health signal, the bar and the page. */
export function adminShell(workspace: Workspace, route: Route, admin: AdminContext, page: Node[], bar?: PageBar): Node[] {
  return appFrame(rail(admin, route), workspace, page, bar);
}

/** The admin bar: crumbs, then the sample tag and the tenant tag (or the plan, without the account). */
export function adminBar(admin: AdminContext, zone: "admin" | "system", page: string, options: { sample?: boolean; plan?: boolean; actions?: Node[] } = {}): PageBar {
  const tags: NonNullable<PageBar["tags"]> = [{ label: fill(catalog.admin.tenant, { name: admin.tenant.name }) }];
  if (options.plan) tags.push({ label: catalog.admin.plan[admin.tenant.plan], hue: "lime" });
  return {
    crumbs: [{ label: catalog.admin.crumbs[zone], href: href(zone === "admin" ? paths.admin : paths.health) }, { label: page }],
    sample: options.sample === false ? null : "data",
    tags: options.plan || options.sample !== false ? tags : [],
    hideAccount: options.plan,
    actions: options.actions,
  };
}
