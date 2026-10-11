import { catalog } from "../../content/catalog";
import type { Workspace } from "../../types/domain";
import { space, stack, type Node } from "../../ui/kit";
import { fill, formatDate, formatNumber } from "../format";
import { href, navigate, paths, type Route } from "../router";
import { debounce } from "../timing";
import type { PageBar } from "../view";

const words = catalog.studio.rail;

export function railSelection(route: Route): string {
  if (route.zone === "studio" && route.page === "assistant") return "assistant";
  if (route.zone === "studio" && ["overview", "templates", "insights", "settings"].includes(route.page)) return route.page;
  if (route.zone === "admin") return "admin";
  return "project";
}

/** The studio rail as XWUIAppRail data. */
function rail(workspace: Workspace, route: Route): Node {
  const { usage } = workspace;
  return {
    tag: "xwui-app-rail",
    key: "studio-rail",
    // On a phone the rail starts closed: only its head bar shows until the toggle opens it.
    config: { collapsed: window.matchMedia("(max-width: 860px)").matches },
    data: {
      selected: railSelection(route),
      labels: {
        nav: words.label,
        collapse: words.collapse,
        expand: words.expand,
      },
      sections: [
        {
          id: "main",
          items: [
            {
              id: "assistant",
              label: words.assistant,
              href: href(paths.studio),
              icon: "sparkles",
              badge: { label: words.preview, hue: "lime" },
            },
            {
              id: "overview",
              label: words.overview,
              href: href(paths.overview),
              icon: "layout-grid",
            },
          ],
        },
        {
          id: "project",
          title: words.groups.project,
          items: [
            {
              id: "project",
              label: workspace.project.name,
              href: href(paths.flows),
              swatch: true,
              caret: true,
            },
          ],
        },
        {
          id: "chats",
          title: words.groups.chats,
          items: workspace.chats.map((chat) => ({
            id: chat.id,
            label: chat.title,
            href: href(paths.studio, { chat: chat.id }),
            icon: "message-square",
            badge: chat.waiting
              ? { label: words.waiting, hue: "amber" }
              : undefined,
          })),
        },
      ],
      footer: [
        {
          id: "admin",
          label: words.admin,
          href: href(paths.admin),
          icon: "shield",
        },
        {
          id: "templates",
          label: words.templates,
          href: href(paths.templates),
          icon: "layers",
        },
        {
          id: "insights",
          label: words.insights,
          href: href(paths.insights),
          icon: "bar-chart-2",
        },
        {
          id: "settings",
          label: words.settings,
          href: href(paths.settings),
          icon: "sliders",
        },
      ],
      usage:
        usage.used !== null &&
        usage.included !== null &&
        usage.periodEnds !== null
          ? {
              label: fill(words.usage, {
                used: formatNumber(usage.used),
                included: formatNumber(usage.included),
              }),
              caption: fill(words.periodEnds, {
                date: formatDate(usage.periodEnds),
              }),
              ratio: usage.ratio,
              ariaLabel: words.usageLabel,
            }
          : null,
    },
    slots: {
      brand: {
        tag: "xwui-logo",
        data: {},
        config: {
          svgPath: "styles/brand/xwflow/logo/xwflow-logo.svg",
          logoConfig: "logo-title",
          title: catalog.brand,
          size: "xxs",
          layout: "h",
          href: href(paths.home),
        },
      },
      search: {
        tag: "xwui-input-text",
        data: { placeholder: words.search },
        config: {
          type: "search",
          leadingIcon: "search",
          ariaLabel: words.searchLabel,
          suffix: words.searchKeys,
          fullWidth: true,
        },
        ref: (instance) =>
          (
            instance as { onChange(handler: (value: string) => void): void }
          ).onChange(
            debounce(
              (query: string) => navigate(paths.flows, { q: query.trim() }),
              350,
            ),
          ),
      },
      create: {
        tag: "xwui-button",
        data: { text: words.create },
        config: {
          variant: "primary",
          icon: "plus",
          fullWidth: true,
          shape: "pill",
        },
        on: { click: () => navigate(paths.studio) },
      },
    },
  };
}

/** What the app bar shows for a page: crumbs, meta, the sample tag, context tags and the account. */
export function appBarData(workspace: Workspace, bar: PageBar | undefined): Record<string, unknown> {
  const topbar = catalog.studio.topbar;
  const sample = bar?.sample === undefined ? "rows" : bar.sample;
  return {
    crumbs: bar?.crumbs ?? [],
    meta: bar?.meta,
    sampleTag: sample === "rows" ? topbar.sampleRows : sample === "data" ? topbar.sampleData : undefined,
    tags: bar?.tags,
    account: bar?.hideAccount ? null : { name: workspace.you.name, label: topbar.account },
  };
}

/**
 * The app bar. Its actions sit in their own composer (key "app-bar-actions"),
 * so a page change swaps them, keys and refs included, without rebuilding the bar.
 */
export function appBar(workspace: Workspace, bar: PageBar | undefined): Node {
  return {
    tag: "xwui-app-bar",
    key: "app-bar",
    data: appBarData(workspace, bar),
    slots: { actions: [{ tag: "xwui-composer", key: "app-bar-actions", data: { tree: bar?.actions ?? [] } }] },
  };
}

/**
 * A page's items in the app frame's page area, one gap apart. The page area is
 * swapped on its own, so the spacing lives in its tree, not around it.
 */
export function appPage(body: Node[]): Node[] {
  return [stack(body, { gap: "xl" })];
}

/**
 * An app frame: a rail on the start side, then the sticky XWUIAppBar and the
 * page. Shared by the studio and the admin shells.
 */
export function appFrame(railNode: Node, workspace: Workspace, page: Node[], bar?: PageBar): Node[] {
  // A plain box, not a stack: the bar's host must be a direct child of the tall
  // column for its stickiness to hold while the page scrolls.
  const main: Node = {
    tag: "xwui-box",
    slots: {
      children: [
        appBar(workspace, bar),
        {
          tag: "xwui-box",
          config: { padding: space("page") },
          slots: { children: page },
        },
      ],
    },
  };
  // Rail beside the page from tablet width up; stacked on a phone.
  return [
    {
      tag: "xwui-grid",
      config: {
        columns: "minmax(0, 1fr)",
        gap: space("none"),
        alignItems: "start",
        responsive: { md: { columns: "auto minmax(0, 1fr)" } },
      },
      slots: { children: [railNode, main] },
    },
  ];
}

/** The studio frame: the studio rail beside the bar and the page. */
export function studioShell(
  workspace: Workspace,
  route: Route,
  page: Node[],
  bar?: PageBar,
): Node[] {
  return appFrame(rail(workspace, route), workspace, page, bar);
}
