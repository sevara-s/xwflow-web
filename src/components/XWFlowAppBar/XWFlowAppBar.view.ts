import { el } from "../../app/dom";
import type { XWFlowAppBarConfig, XWFlowAppBarData } from "./XWFlowAppBar.types";

export interface AppBarSlots {
  actions: HTMLElement;
  sample: HTMLElement | null;
  tags: HTMLElement[];
  avatar: HTMLElement | null;
}

export function renderAppBar(container: HTMLElement, data: XWFlowAppBarData, config: XWFlowAppBarConfig): AppBarSlots {
  container.className = ["xwflow-appbar", config.className].filter(Boolean).join(" ");
  const crumbs = el("nav", "xwflow-appbar__crumbs");
  crumbs.setAttribute("aria-label", "Breadcrumb");
  data.crumbs.forEach((crumb, index) => {
    if (index > 0) crumbs.append(el("span", "xwflow-appbar__sep", "/"));
    const last = index === data.crumbs.length - 1;
    if (crumb.href && !last) {
      const link = el("a", "xwflow-appbar__link", crumb.label);
      link.href = crumb.href;
      crumbs.append(link);
    } else {
      const here = el("b", "xwflow-appbar__here", crumb.label);
      if (last) here.setAttribute("aria-current", "page");
      crumbs.append(here);
    }
  });
  if (data.meta) crumbs.append(el("span", "xwflow-appbar__meta", data.meta));

  const end = el("div", "xwflow-appbar__end");
  const actions = el("div", "xwflow-appbar__actions");
  const sample = data.sampleTag ? el("span", "xwflow-appbar__sample") : null;
  const tags = (data.tags ?? []).map(() => el("span"));
  const avatar = data.hideAccount ? null : el("span", "xwflow-appbar__avatar");
  end.append(actions);
  if (sample) end.append(sample);
  end.append(...tags);
  if (avatar) end.append(avatar);
  container.replaceChildren(crumbs, end);
  return { actions, sample, tags, avatar };
}
