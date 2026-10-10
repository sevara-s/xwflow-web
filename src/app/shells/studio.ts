import { XWFlowRail } from "../../components/XWFlowRail/XWFlowRail";
import type { RailItem, XWFlowRailData } from "../../components/XWFlowRail/XWFlowRail.types";
import { catalog } from "../../content/catalog";
import type { Workspace } from "../../types/domain";
import { el } from "../dom";
import { fill, formatDate, formatNumber } from "../format";
import { MountScope } from "../mount";
import { href, navigate, paths, type Route } from "../router";
import { debounce } from "../timing";

const words = catalog.studio.rail;

export interface Shell {
  header: HTMLElement;
  body: HTMLElement;
  update(route: Route): void;
  destroy(): void;
}

function railSelection(route: Route): string {
  if (route.zone === "studio" && route.page === "assistant") return "assistant";
  if (route.zone === "admin") return "admin";
  return "project";
}

function railData(workspace: Workspace, route: Route): XWFlowRailData {
  const chats: RailItem[] = workspace.chats.map((chat) => ({
    id: chat.id,
    label: chat.title,
    href: href(paths.studio, { chat: chat.id }),
    icon: "message-square",
    badge: chat.waiting ? { label: words.waiting, tone: "amber" } : undefined,
  }));
  const { usage } = workspace;
  return {
    brand: { label: catalog.brand, href: href(paths.home) },
    labels: {
      nav: words.label,
      search: words.search,
      searchAria: words.searchLabel,
      searchKeys: words.searchKeys,
      create: words.create,
      collapse: words.collapse,
      expand: words.expand,
    },
    sections: [
      {
        id: "main",
        items: [
          { id: "assistant", label: words.assistant, href: href(paths.studio), icon: "sparkles", badge: { label: words.preview, tone: "lime" } },
          { id: "overview", label: words.overview, href: href(paths.runs), icon: "layout-grid" },
        ],
      },
      {
        id: "project",
        title: words.groups.project,
        items: [{ id: "project", label: workspace.project.name, href: href(paths.flows), swatch: true, caret: true }],
      },
      { id: "chats", title: words.groups.chats, items: chats },
    ],
    footer: [
      { id: "admin", label: words.admin, href: href(paths.admin), icon: "shield" },
      { id: "templates", label: words.templates, href: href(paths.studio, { section: "templates" }), icon: "layers" },
      { id: "insights", label: words.insights, href: href(paths.runs), icon: "bar-chart-2" },
      { id: "settings", label: words.settings, href: href(paths.connections), icon: "sliders" },
    ],
    usage:
      usage.used !== null && usage.included !== null && usage.periodEnds !== null
        ? {
            label: fill(words.usage, { used: formatNumber(usage.used), included: formatNumber(usage.included) }),
            caption: fill(words.periodEnds, { date: formatDate(usage.periodEnds) }),
            ratio: usage.ratio,
            ariaLabel: words.usageLabel,
          }
        : null,
    selected: railSelection(route),
  };
}

/** Rail on the left, a header and the page on the right. */
export function mountStudioShell(root: HTMLElement, workspace: Workspace, route: Route): Shell {
  const scope = new MountScope();
  const frame = el("div", "xwflow-studio");
  const railHost = el("aside", "xwflow-studio__rail");
  const main = el("div", "xwflow-studio__main");
  const header = el("div", "xwflow-studio__header");
  const body = el("main", "xwflow-studio__body");
  main.append(header, body);
  frame.append(railHost, main);
  root.replaceChildren(frame);

  const rail = scope.track(new XWFlowRail(railHost, railData(workspace, route)));
  rail.on(
    "search",
    debounce((query: string) => navigate(paths.flows, { q: query.trim() }), 350),
  );
  rail.on("create", () => navigate(paths.studio));

  return {
    header,
    body,
    update(next) {
      rail.select(railSelection(next));
    },
    destroy() {
      scope.destroy();
    },
  };
}
