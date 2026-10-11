import { catalog } from "../../content/catalog";
import type { AdminContext, Workspace } from "../../types/domain";
import type { Node } from "../../ui/kit";
import { fill } from "../format";
import { href, paths, type Route } from "../router";
import { siteHref } from "../site-links";
import type { PageBar } from "../view";
import { appFrame } from "./studio-view";

const words = catalog.admin.rail;

type Target = (typeof words.admin)[number]["target"] | (typeof words.system)[number]["target"];

/** Rail items outside the prototype's screens open the closest real screen. */
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

function rail(admin: AdminContext, route: Route): Node {
  const item = (entry: { id: string; label: string; icon: string; target: Target }) => ({
    id: entry.id,
    label: entry.label,
    icon: entry.icon,
    href: targets[entry.target],
    status:
      entry.id === "health" && admin.health !== "ok"
        ? { tone: admin.health === "err" ? "error" : "warning", label: admin.health === "err" ? words.healthFailing : words.healthWarning }
        : undefined,
  });
  return {
    tag: "xwui-app-rail",
    key: "admin-rail",
    // On a phone the rail starts closed: only its head bar shows until the toggle opens it.
    config: { slim: true, collapsed: window.matchMedia("(max-width: 860px)").matches },
    data: {
      selected: selection(route),
      headTag: { label: words.tag, hue: "violet" },
      labels: { nav: words.label, collapse: catalog.studio.rail.collapse, expand: catalog.studio.rail.expand },
      sections: [
        { id: "admin", title: words.groups.admin, items: words.admin.map(item) },
        { id: "system", title: words.groups.system, items: words.system.map(item) },
      ],
      footer: [{ id: "back", label: words.back, href: href(paths.studio), icon: "arrow-left" }],
      usage: null,
    },
    slots: {
      brand: {
        tag: "xwui-logo",
        data: {},
        config: { svgPath: "styles/brand/xwflow/logo/xwflow-logo.svg", logoConfig: "logo-title", title: catalog.brand, size: "xs", layout: "h", href: href(paths.home) },
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
