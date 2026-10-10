import { api } from "../../api/client";
import { el, slot } from "../../app/dom";
import { fill } from "../../app/format";
import type { Tracker } from "../../app/mount";
import type { PageContext } from "../../app/page";
import { href, navigate, paths, type NotationView, type Route } from "../../app/router";
import { XWFlowBrand } from "../../components/XWFlowBrand/XWFlowBrand";
import { catalog } from "../../content/catalog";
import type { FlowView } from "../../types/domain";
import { XWUIButton, XWUINavTabs, XWUISegmentedControl } from "../../xwui";
import { mountTag } from "../studio/common";
import "./views.css";

type ViewRoute = Extract<Route, { page: "view" }>;

const words = catalog.views;

/** What every view module gets: the stage, a bottom bar and the export hook. */
export interface ViewContext {
  view: FlowView;
  stage: HTMLElement;
  footer: HTMLElement;
  scope: Tracker;
  setExport: (handler: () => void) => void;
}

const modules: Record<NotationView, () => Promise<{ mount: (context: ViewContext, mode: NotationView) => void }>> = {
  flowchart: () => import("./diagram-views"),
  swimlane: () => import("./diagram-views"),
  bpmn: () => import("./diagram-views"),
  sequence: () => import("./diagram-views"),
  sim: () => import("./simulation"),
  "3d": () => import("./space"),
};

export async function render(context: PageContext<ViewRoute>): Promise<void> {
  const { route, scope, body } = context;
  const view = await api.getFlowView(route.flowId);
  const flowName = view.flow.name;
  document.title = fill(words.titles[route.view], { flow: flowName });
  scope.track({ destroy: () => (document.title = catalog.brand) });

  const page = el("div", "xwflow-views");
  page.dataset.view = route.view;
  body.append(page);

  const header = el("header", "xwflow-views__header");
  page.append(header);
  const back = scope.track(new XWUIButton(slot(header), { text: "" }, { variant: "ghost", size: "sm", icon: "arrow-left", ariaLabel: words.back, title: words.back }));
  back.onClick(() => navigate(paths.flows));
  scope.track(new XWFlowBrand(slot(header), { label: catalog.brand, href: href(paths.home) }, { markOnly: true }));
  const crumbs = el("nav", "xwflow-editor__crumbs");
  crumbs.setAttribute("aria-label", "Breadcrumb");
  const project = el("a", undefined, context.workspace.project.name);
  project.href = href(paths.flows);
  const flowLink = el("b", undefined, flowName);
  crumbs.append(project, el("span", undefined, "/"), flowLink);
  header.append(crumbs);
  if (view.flow.status !== "draft") mountTag(slot(header), scope, { label: catalog.studio.flowStatus.published, color: "lime" });

  const tabsHost = slot(header, "xwflow-tabs xwflow-views__tabs");
  const tabs = scope.track(
    new XWUINavTabs(tabsHost, { tabs: words.tabs.map((tab) => ({ ...tab })), activeTab: route.view }, { variant: "button", size: "sm", ariaLabel: words.tabsLabel, hideContent: "true" }),
  );
  tabs.onChange((id) => {
    if (id === "editor") navigate(paths.flow(view.flow.id));
    else if (id === "all") navigate(paths.notations);
    else navigate(paths.flowView(view.flow.id, id as NotationView));
  });

  const end = el("div", "xwflow-row xwflow-gap-8 xwflow-push");
  header.append(end);
  const dimension = scope.track(
    new XWUISegmentedControl(slot(end, "xwflow-segmented"), { value: route.view === "3d" ? "3d" : "2d" }, { options: words.dimensions.map((item) => ({ ...item })), ariaLabel: words.dimensionLabel }),
  );
  dimension.onChange?.((value: string) => {
    if (value === "3d" && route.view !== "3d") navigate(paths.flowView(view.flow.id, "3d"));
    if (value === "2d" && route.view === "3d") navigate(paths.flowView(view.flow.id, "flowchart"));
  });
  const exporter = scope.track(new XWUIButton(slot(end), { text: words.export }, { variant: "ghost", size: "sm", icon: "download", className: "xwflow-btn-glass" }));
  let exportHandler: (() => void) | null = null;
  exporter.onClick(() => exportHandler?.());

  const stage = el("section", "xwflow-views__stage");
  stage.setAttribute("aria-label", fill(words.titles[route.view], { flow: flowName }));
  page.append(stage);
  const footer = el("div", "xwflow-views__footer");
  page.append(footer);

  const module = await modules[route.view]();
  module.mount({ view, stage, footer, scope, setExport: (handler) => (exportHandler = handler) }, route.view);
}
