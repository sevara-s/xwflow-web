import { el, slot } from "../../app/dom";
import type { MountScope, Tracker } from "../../app/mount";
import { notify } from "../../app/notify";
import type { PageContext } from "../../app/page";
import { href, navigate, paths } from "../../app/router";
import type { TagView } from "../../app/status";
import { XWFlowAppBar } from "../../components/XWFlowAppBar/XWFlowAppBar";
import type { Crumb } from "../../components/XWFlowAppBar/XWFlowAppBar.types";
import { XWFlowStatus } from "../../components/XWFlowStatus/XWFlowStatus";
import { catalog } from "../../content/catalog";
import type { StatusTone } from "../../types/domain";
import { XWUINavTabs, XWUITag } from "../../xwui";

const words = catalog.studio;

export function mountAppBar(
  context: PageContext,
  crumbs: Crumb[],
  options: { meta?: string; sample?: "rows" | "data" | null } = {},
): XWFlowAppBar {
  const sample = options.sample === undefined ? "rows" : options.sample;
  return context.scope.track(
    new XWFlowAppBar(context.header, {
      crumbs,
      meta: options.meta,
      sampleTag: sample === "rows" ? words.topbar.sampleRows : sample === "data" ? words.topbar.sampleData : undefined,
      accountLabel: words.topbar.account,
      accountName: context.workspace.you.name,
    }),
  );
}

export function projectCrumb(context: PageContext): Crumb {
  return { label: context.workspace.project.name, href: href(paths.flows) };
}

type ProjectTab = (typeof words.projectTabs)[number];

const tabRoutes: Record<string, string> = { flows: paths.flows, connections: paths.connections, runs: paths.runs };

/** Flows, Connections, Runs and the other project sections, as XWUI pill tabs. */
export function mountProjectTabs(
  host: HTMLElement,
  scope: MountScope,
  active: string,
  only?: ReadonlyArray<ProjectTab["id"]>,
): void {
  const tabs = words.projectTabs.filter((tab) => !only || only.includes(tab.id));
  host.classList.add("xwflow-tabs");
  const nav = scope.track(
    new XWUINavTabs(
      host,
      { tabs: tabs.map((tab) => ({ id: tab.id, label: tab.label })), activeTab: active },
      { variant: "button", size: "sm", ariaLabel: words.projectTabsLabel, hideContent: "true" },
    ),
  );
  nav.onChange((id) => {
    const tab = tabs.find((item) => item.id === id);
    if (tab?.route && tabRoutes[tab.route]) {
      navigate(tabRoutes[tab.route]);
      return;
    }
    notify(words.comingSoon.replace("{name}", tab?.label ?? id), "info");
    nav.setActiveTab(active);
  });
}

export function mountTag(host: HTMLElement, scope: Tracker, view: TagView, size: "small" | "medium" = "small"): XWUITag {
  return scope.track(new XWUITag(host, { label: view.label }, { size, className: `xwflow-tag xwflow-tag--${view.color}` }));
}

export function mountStatus(host: HTMLElement, scope: Tracker, tone: StatusTone, label: string, size: "sm" | "md" = "md"): void {
  scope.track(new XWFlowStatus(host, { tone, label }, { size }));
}

/** A glass panel. `pad` follows the prototype's s/m/l padding scale. */
export function glass(parent: HTMLElement, options: { pad?: "s" | "m" | "l"; border?: "gradient"; className?: string; label?: string } = {}): HTMLElement {
  const panel = el(options.label ? "section" : "div", ["xwflow-glass", options.className].filter(Boolean).join(" "));
  if (options.pad) panel.dataset.pad = options.pad;
  if (options.border) panel.dataset.border = options.border;
  if (options.label) panel.setAttribute("aria-label", options.label);
  parent.append(panel);
  return panel;
}

export function heading(parent: HTMLElement, level: 1 | 2, size: "h2" | "h3", text: string): HTMLElement {
  const node = el(level === 1 ? "h1" : "h2", `xwflow-${size}`, text);
  parent.append(node);
  return node;
}

export { slot };
