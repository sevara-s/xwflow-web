import "../../styles/site.css";
import { XWFlowBrand } from "../../components/XWFlowBrand/XWFlowBrand";
import { catalog } from "../../content/catalog";
import { XWUIBarSiteFooter, XWUIBarSiteHeader, XWUITag } from "../../xwui";
import { el, slot } from "../dom";
import { MountScope } from "../mount";
import { notify } from "../notify";
import { href, paths, type Route } from "../router";
import { siteHref } from "../site-links";
import type { Shell } from "./studio";

const words = catalog.site;

function currentNav(route: Route): string {
  if (route.zone !== "site") return "";
  const page = route.page === "landing" ? "landing" : route.page;
  const match = words.nav.links.find((link) => link.target === page && !link.section);
  return match ? siteHref(match.target, match.section) : "";
}

/** XWUIBarSiteHeader on top, the page, then XWUIBarSiteFooter and the wordmark. */
export function mountSiteShell(root: HTMLElement, route: Route): Shell {
  const scope = new MountScope();
  const frame = el("div", "xwflow-site");
  const headerWrap = el("div", "xwflow-site__nav");
  const header = el("div", "xwflow-site__header");
  const body = el("main", "xwflow-site__body");
  const footer = el("footer", "xwflow-site__footer");
  frame.append(headerWrap, header, body, footer);
  root.replaceChildren(frame);

  const navData = (current: Route) => ({
    brand: { href: href(paths.home), title: catalog.brand },
    // With routeLinks "hash", XWUI adds the "#" itself and matches currentPath against bare paths.
    links: words.nav.links.map((link) => ({ path: siteHref(link.target, link.section).slice(1), label: link.label })),
    currentPath: currentNav(current).slice(1),
    actions: [
      { label: words.nav.language, href: "#language", variant: "ghost", collapsePriority: 3 },
      { label: words.nav.signIn, href: href(paths.studio), variant: "ghost", collapsePriority: 2 },
      { label: words.nav.start, href: href(paths.flows), variant: "primary", collapsePriority: 1 },
    ],
  });
  // XWUIBarSiteHeader keeps its own internal lists, so a route change mounts a fresh one.
  let nav: XWUIBarSiteHeader | null = null;
  const mountNav = (current: Route): void => {
    nav?.destroy();
    headerWrap.replaceChildren();
    nav = new XWUIBarSiteHeader(slot(headerWrap, "xwflow-site__bar"), navData(current), {
      position: "static",
      blur: true,
      bordered: true,
      routeLinks: "hash",
      autoSyncRoute: false,
      ariaLabel: words.nav.label,
      className: "xwflow-navbar",
      mobileBreakpoint: 980,
    });
  };
  mountNav(route);
  scope.track({ destroy: () => nav?.destroy() });
  headerWrap.addEventListener("click", (event) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href="#language"]');
    if (!link) return;
    event.preventDefault();
    notify(words.footer.languageSoon, "info");
  });

  const columns = words.footer.columns.map((column) => ({
    title: column.title,
    links: column.links.map((link) => ({ label: link.label, href: siteHref(link.target, link.section) })),
  }));
  scope.track(
    new XWUIBarSiteFooter(
      slot(footer, "xwflow-site__footer-bar"),
      {
        brand: { href: href(paths.home), description: words.footer.tagline },
        columns,
        bottom: { left: "", right: "" },
      },
      { bordered: false, className: "xwflow-footer" },
    ),
  );
  const tags = el("div", "xwflow-row xwflow-gap-8 xwflow-site__footer-tags");
  for (const tag of words.footer.tags) {
    scope.track(new XWUITag(slot(tags), { label: tag.label }, { size: "small", className: `xwflow-tag xwflow-tag--${tag.color}` }));
  }
  const brandSlot = footer.querySelector<HTMLElement>(".xwui-bar-site-footer__brand");
  if (brandSlot) {
    const mark = el("div");
    brandSlot.prepend(mark);
    scope.track(new XWFlowBrand(mark, { label: catalog.brand, href: href(paths.home) }));
    brandSlot.append(tags);
  } else {
    footer.prepend(tags);
  }

  const mark = el("div", "xwflow-site__wordmark", catalog.brand);
  mark.setAttribute("aria-hidden", "true");
  const legal = el("div", "xwflow-site__legal");
  const source = el("span", "xwflow-push");
  source.append(`${words.footer.source} `, el("span", "xwflow-placeholder", words.footer.sourcePlaceholder));
  legal.append(el("span", undefined, words.footer.license), source);
  footer.append(mark, legal);

  return {
    header,
    body,
    update(next) {
      mountNav(next);
    },
    destroy() {
      scope.destroy();
    },
  };
}
