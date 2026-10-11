import { catalog } from "../../content/catalog";
import { column, row, stack, tag, text, type Node } from "../../ui/kit";
import { href, paths, type Route } from "../router";
import { siteHref } from "../site-links";

const words = catalog.site;

function currentNav(route: Route): string {
  if (route.zone !== "site") return "";
  const page = route.page === "landing" ? "landing" : route.page;
  const match = words.nav.links.find(
    (link) => link.target === page && !link.section,
  );
  return match ? siteHref(match.target, match.section) : "";
}

/** The website frame: XWUIBarSiteHeader, the page, XWUIBarSiteFooter and the wordmark. */
export function siteShell(route: Route, page: Node[]): Node[] {
  const header: Node = {
    tag: "xwui-bar-site-header",
    key: `site-header-${currentNav(route)}`,
    data: {
      brand: {
        href: href(paths.home),
        title: catalog.brand,
        logo: {
          svgPath: "styles/brand/xwflow/logo/xwflow-logo.svg",
          logoConfig: "logo-title",
          title: catalog.brand,
          size: "xs",
          layout: "h",
        },
      },
      // With routeLinks "hash", XWUI adds the "#" itself and matches currentPath against bare paths.
      links: words.nav.links.map((link) => ({
        path: siteHref(link.target, link.section).slice(1),
        label: link.label,
      })),
      currentPath: currentNav(route).slice(1),
      actions: [
        {
          label: words.nav.language,
          href: "#language",
          variant: "ghost",
          collapsePriority: 3,
        },
        {
          label: words.nav.signIn,
          href: href(paths.studio),
          variant: "ghost",
          collapsePriority: 2,
        },
        {
          label: words.nav.start,
          href: href(paths.flows),
          variant: "primary",
          collapsePriority: 1,
        },
      ],
    },
    config: {
      position: "sticky",
      floating: true,
      routeLinks: "hash",
      autoSyncRoute: false,
      ariaLabel: words.nav.label,
      mobileBreakpoint: 980,
    },
  };

  const footer: Node = {
    tag: "xwui-bar-site-footer",
    data: {
      brand: { href: href(paths.home), description: words.footer.tagline },
      columns: words.footer.columns.map((group) => ({
        title: group.title,
        links: group.links.map((link) => ({
          label: link.label,
          href: siteHref(link.target, link.section),
        })),
      })),
      bottom: { left: "", right: "" },
    },
    config: { bordered: false },
  };

  const wordmark = text("h1", catalog.brand, { align: "center" });
  wordmark.config = {
    ...wordmark.config,
    component: "div",
    ariaRole: "presentation",
    fontSize: "clamp(4rem, 17vw, 15rem)",
    lineHeight: 0.85,
    letterSpacing: "-0.06em",
    color: "gradient",
    gradient:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0))",
  };

  const legal = row(
    [
      text("small", words.footer.license, { tone: "tertiary" }),
      row([
        text("small", words.footer.source, { tone: "tertiary" }),
        tag(words.footer.sourcePlaceholder, "lime"),
      ]),
    ],
    { justify: "space-between", wrap: true },
  );

  // The whole page clips sideways, so glows may spill across sections
  // (behind the bar too) without a horizontal scroll.
  return [
    {
      tag: "xwui-box",
      config: { position: "relative", overflow: "clip" },
      slots: {
        // The header is a direct child of the page box (not inside the stack),
        // so it stays at the top while the whole page scrolls under it.
        children: [
          header,
          stack(
            [
              ...page,
              column(
                stack(
                  [
                    footer,
                    row(
                      words.footer.tags.map((item) =>
                        tag(
                          item.label,
                          item.color === "plain"
                            ? undefined
                            : (item.color as "lime"),
                        ),
                      ),
                    ),
                    wordmark,
                    legal,
                  ],
                  { gap: 24 },
                ),
              ),
            ],
            { gap: 0 },
          ),
        ],
      },
    },
  ];
}
