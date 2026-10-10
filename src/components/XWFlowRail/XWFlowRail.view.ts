import { el } from "../../app/dom";
import type { RailItem, XWFlowRailConfig, XWFlowRailData } from "./XWFlowRail.types";

export interface RailSlots {
  brand: HTMLElement;
  headTag: HTMLElement | null;
  collapse: HTMLElement;
  search: HTMLElement | null;
  create: HTMLElement | null;
  statuses: Array<{ host: HTMLElement; status: NonNullable<RailItem["status"]> }>;
  icons: Array<{ host: HTMLElement; name: string }>;
  badges: Array<{ host: HTMLElement; badge: NonNullable<RailItem["badge"]> }>;
  usageBar: HTMLElement | null;
}

export function renderRail(container: HTMLElement, data: XWFlowRailData, config: XWFlowRailConfig): RailSlots {
  container.className = ["xwflow-rail", config.className].filter(Boolean).join(" ");
  container.toggleAttribute("data-collapsed", Boolean(config.collapsed));
  container.toggleAttribute("data-slim", Boolean(config.slim));
  container.setAttribute("aria-label", data.labels.nav);
  container.setAttribute("role", "navigation");

  const head = el("div", "xwflow-rail__head");
  const brand = el("div", "xwflow-rail__brand");
  const headTag = data.headTag ? el("span", "xwflow-rail__head-tag") : null;
  const collapse = el("div", "xwflow-rail__collapse");
  head.append(brand);
  if (headTag) head.append(headTag);
  head.append(collapse);

  const search = data.labels.search ? el("div", "xwflow-rail__search") : null;
  const create = data.labels.create ? el("div", "xwflow-rail__create") : null;
  const statuses: RailSlots["statuses"] = [];

  const icons: RailSlots["icons"] = [];
  const badges: RailSlots["badges"] = [];
  const list = el("div", "xwflow-rail__list");

  const item = (entry: RailItem): HTMLAnchorElement => {
    const link = el("a", "xwflow-rail__item");
    link.href = entry.href;
    link.title = entry.label;
    if (entry.id === data.selected) link.setAttribute("aria-current", "page");
    if (entry.swatch) {
      link.append(el("span", "xwflow-rail__swatch"));
    } else if (entry.icon) {
      const host = el("span", "xwflow-rail__icon");
      icons.push({ host, name: entry.icon });
      link.append(host);
    }
    link.append(el("span", "xwflow-rail__label", entry.label));
    if (entry.badge) {
      const host = el("span", "xwflow-rail__badge");
      badges.push({ host, badge: entry.badge });
      link.append(host);
    }
    if (entry.status) {
      const host = el("span", "xwflow-rail__status");
      statuses.push({ host, status: entry.status });
      link.append(host);
    }
    if (entry.caret) {
      const host = el("span", "xwflow-rail__caret");
      icons.push({ host, name: "chevron-down" });
      link.append(host);
    }
    return link;
  };

  for (const section of data.sections) {
    if (section.title) list.append(el("div", "xwflow-rail__group", section.title));
    for (const entry of section.items) list.append(item(entry));
  }

  const footer = el("div", "xwflow-rail__footer");
  for (const entry of data.footer) footer.append(item(entry));

  let usageBar: HTMLElement | null = null;
  if (data.usage) {
    const meter = el("div", "xwflow-rail__meter");
    meter.append(el("b", "xwflow-rail__meter-label", data.usage.label));
    usageBar = el("div", "xwflow-rail__meter-bar");
    usageBar.setAttribute("role", "group");
    usageBar.setAttribute("aria-label", data.usage.ariaLabel);
    meter.append(usageBar, el("span", "xwflow-rail__meter-caption", data.usage.caption));
    footer.append(meter);
  }

  container.replaceChildren(head, ...(search ? [search] : []), ...(create ? [create] : []), list, footer);
  return { brand, headTag, collapse, search, create, statuses, icons, badges, usageBar };
}
