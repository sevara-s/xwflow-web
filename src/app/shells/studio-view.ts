import { catalog } from "../../content/catalog";
import type { Workspace } from "../../types/domain";
import { stack, type Node } from "../../ui/kit";
import { fill, formatDate, formatNumber } from "../format";
import { href, navigate, paths, type Route } from "../router";
import { debounce } from "../timing";
import type { PageBar } from "../view";

const words = catalog.studio.rail;

function railSelection(route: Route): string {
  if (route.zone === "studio" && route.page === "assistant") return "assistant";
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
              href: href(paths.runs),
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
          href: href(paths.studio, { section: "templates" }),
          icon: "layers",
        },
        {
          id: "insights",
          label: words.insights,
          href: href(paths.runs),
          icon: "bar-chart-2",
        },
        {
          id: "settings",
          label: words.settings,
          href: href(paths.connections),
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
          size: "xs",
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

function appBar(workspace: Workspace, bar: PageBar | undefined): Node {
  const topbar = catalog.studio.topbar;
  const sample = bar?.sample === undefined ? "rows" : bar.sample;
  return {
    tag: "xwui-app-bar",
    data: {
      crumbs: bar?.crumbs ?? [],
      meta: bar?.meta,
      sampleTag:
        sample === "rows"
          ? topbar.sampleRows
          : sample === "data"
            ? topbar.sampleData
            : undefined,
      tags: bar?.tags,
      account: bar?.hideAccount
        ? null
        : { name: workspace.you.name, label: topbar.account },
    },
    slots: bar?.actions?.length ? { actions: bar.actions } : undefined,
  };
}

/** The studio frame: XWUIAppRail on the start side, XWUIAppBar and the page on the other. */
export function studioShell(
  workspace: Workspace,
  route: Route,
  page: Node[],
  bar?: PageBar,
): Node[] {
  // A plain box, not a stack: the bar's host must be a direct child of the tall
  // column for its stickiness to hold while the page scrolls.
  const main: Node = {
    tag: "xwui-box",
    slots: {
      children: [
        appBar(workspace, bar),
        {
          tag: "xwui-box",
          config: { padding: "28px" },
          slots: { children: stack(page, { gap: 22 }) },
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
        gap: "0",
        alignItems: "start",
        responsive: { md: { columns: "auto minmax(0, 1fr)" } },
      },
      slots: { children: [rail(workspace, route), main] },
    },
  ];
}
