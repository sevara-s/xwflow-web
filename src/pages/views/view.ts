import { api } from "../../api/client";
import { fill } from "../../app/format";
import {
  href,
  navigate,
  paths,
  type NotationView,
  type Route,
} from "../../app/router";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { FlowView } from "../../types/domain";
import { button, glass, row, shape, space, stack, tag, text, type Node } from "../../ui/kit";
import { config } from "../../config";

type ViewRoute = Extract<Route, { page: "view" }>;

const words = catalog.views;

/** What one notation view adds to the shared page: its stage, its footer controls and its export. */
export interface ViewPart {
  stage: Node;
  footer: Node[];
  export: () => void;
  /** Set when the stage needs no glass panel around it (the 3D scene). */
  bare?: boolean;
}

export interface ViewPartContext {
  instance: ViewContext["instance"];
  onLeave: ViewContext["onLeave"];
}

async function part(
  view: FlowView,
  mode: NotationView,
  context: ViewPartContext,
): Promise<ViewPart> {
  if (mode === "sim")
    return (await import("./simulation")).simulationPart(view, context);
  if (mode === "3d") return (await import("./space")).spacePart(view, context);
  return (await import("./diagram-views")).diagramPart(view, mode, context);
}

export async function view(
  context: ViewContext<ViewRoute>,
): Promise<PageResult> {
  const { route, workspace } = context;
  const flowView = await api.getFlowView(route.flowId);
  const flowName = flowView.flow.name;
  document.title = fill(words.titles[route.view], { flow: flowName });
  context.onLeave(() => (document.title = catalog.brand));
  const current = await part(flowView, route.view, {
    instance: context.instance,
    onLeave: context.onLeave,
  });

  // One row on a wide screen (the tabs shrink and scroll between crumbs and
  // controls); on a phone the three parts stack and the tabs scroll sideways.
  const header = glass(
    {
      tag: "xwui-grid",
      config: {
        columns: "minmax(0, 1fr)",
        gap: space("m"),
        alignItems: "center",
        responsive: { xl: { columns: "auto minmax(0, 1fr) auto" } },
      },
      slots: {
        children: [
          row(
            [
              button("ghost", "", {
                icon: "arrow-left",
                size: "sm",
                label: words.back,
                onClick: () => navigate(paths.flows),
              }),
              {
                tag: "xwui-logo",
                data: {},
                config: {
                  svgPath: config.logoPath,
                  logoConfig: "logo",
                  title: catalog.brand,
                  size: "xs",
                  href: href(paths.home),
                },
              },
              button("ghost", workspace.project.name, {
                size: "sm",
                href: href(paths.flows),
              }),
              text("small", "/", { tone: "tertiary" }),
              button("ghost", flowName, {
                size: "sm",
                href: href(paths.flow(flowView.flow.id)),
              }),
              ...(flowView.flow.status !== "draft"
                ? [tag(catalog.studio.flowStatus.published, "lime")]
                : []),
            ],
            { gap: "s", wrap: true },
          ),
          {
            tag: "xwui-box",
            config: { overflow: "auto", width: "100%" },
            slots: {
              children: {
                tag: "xwui-tabs",
                data: {
                  tabs: words.tabs.map((tab) => ({ ...tab })),
                  activeTab: route.view,
                },
                config: {
                  variant: "button",
                  size: "sm",
                  ariaLabel: words.tabsLabel,
                  contentMode: "hidden",
                },
                ref: (instance) =>
                  (
                    instance as {
                      onChange(handler: (id: string) => void): void;
                    }
                  ).onChange((id) => {
                    if (id === "editor") navigate(paths.flow(flowView.flow.id));
                    else if (id === "all") navigate(paths.notations);
                    else
                      navigate(
                        paths.flowView(flowView.flow.id, id as NotationView),
                      );
                  }),
              },
            },
          },
          row(
            [
              {
                tag: "xwui-segmented-control",
                data: { value: route.view === "3d" ? "3d" : "2d" },
                config: {
                  options: words.dimensions.map((item) => ({ ...item })),
                  ariaLabel: words.dimensionLabel,
                },
                ref: (instance) =>
                  (
                    instance as {
                      onChange?(handler: (value: string) => void): void;
                    }
                  ).onChange?.((value) => {
                    if (value === "3d" && route.view !== "3d")
                      navigate(paths.flowView(flowView.flow.id, "3d"));
                    if (value === "2d" && route.view === "3d")
                      navigate(paths.flowView(flowView.flow.id, "flowchart"));
                  }),
              },
              button("glass", words.export, {
                size: "sm",
                icon: "download",
                onClick: current.export,
              }),
            ],
            { gap: "s" },
          ),
        ],
      },
    },
    { pad: "s" },
  );

  const stage: Node = current.bare
    ? current.stage
    : {
        tag: "xwui-box",
        config: {
          surface: "glass",
          padding: space("xl"),
          overflow: "clip",
          position: "relative",
          ariaLabel: fill(words.titles[route.view], { flow: flowName }),
        },
        slots: {
          children: stack(
            [
              shape("halo", "violet", 420, { left: "30%", top: "30%" }),
              current.stage,
            ],
            { gap: "none" },
          ),
        },
      };

  return {
    body: [
      {
        tag: "xwui-box",
        config: { padding: space("l") },
        slots: {
          children: stack(
            [
              header,
              stage,
              ...(current.footer.length
                ? [
                    glass(
                      // A single footer node (the simulation's grid) fills the panel itself.
                      current.footer.length === 1
                        ? current.footer[0]
                        : row(current.footer, {
                            gap: "l",
                            wrap: true,
                            align: "center",
                          }),
                      { pad: "s" },
                    ),
                  ]
                : []),
            ],
            { gap: "l" },
          ),
        },
      },
    ],
  };
}
