import { api } from "../../api/client";
import { fill, formatAgo } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { href, navigate, paths, type Route } from "../../app/router";
import type { PageResult, ViewContext } from "../../app/view";
import { catalog } from "../../content/catalog";
import type { FlowVersion } from "../../types/domain";
import { button, glass, row, space, stack, tag, text, type Node } from "../../ui/kit";
import type { XWUIComposer } from "../../xwui";

type VersionsRoute = Extract<Route, { page: "versions" }>;

const words = catalog.workspace.versions;

function entry(version: FlowVersion, current: boolean, flowId: string, restore: (version: FlowVersion) => void): Node {
  const { added, changed, removed } = version.changes;
  return glass(
    row(
      [
        row(
          [
            {
              tag: "xwui-box",
              config: { surface: "glass", padding: space("m"), gradientBorder: current },
              slots: { children: text("small", fill(words.number, { n: version.number }), { bold: true, mono: true }) },
            },
            stack(
              [
                row(
                  [
                    text("body", version.note, { bold: true }),
                    ...(version.label === "Live" ? [tag(words.live, "lime", undefined, true)] : []),
                    ...(version.label === "Draft" ? [tag(words.draft, "amber", undefined, true)] : []),
                  ],
                  { gap: "s", wrap: true },
                ),
                text("xs", fill(words.by, { author: version.author.name, when: formatAgo(version.at).toLocaleLowerCase() }), { tone: "tertiary" }),
                row(
                  [
                    ...(added ? [tag(fill(words.added, { n: added }), "green")] : []),
                    ...(changed ? [tag(fill(words.changed, { n: changed }), "cyan")] : []),
                    ...(removed ? [tag(fill(words.removed, { n: removed }), "red")] : []),
                  ],
                  { gap: "s" },
                ),
              ],
              { gap: "s" },
            ),
          ],
          { gap: "l", align: "flex-start" },
        ),
        current
          ? button("primary", words.openEditor, { size: "sm", iconAfter: true, icon: "arrow-right", onClick: () => navigate(paths.flow(flowId)) })
          : button("glass", words.restore, { size: "sm", icon: "rotate-ccw", onClick: () => restore(version) }),
      ],
      { justify: "space-between", wrap: true, gap: "l" },
    ),
    { pad: "m", glow: current ? "lime" : undefined },
  );
}

export async function view(context: ViewContext<VersionsRoute>): Promise<PageResult> {
  const { route, workspace } = context;
  let history = await api.listVersions(route.flowId);

  const list = (): Node => stack(history.versions.map((version, index) => entry(version, index === 0, route.flowId, (item) => void restore(item))), { gap: "l" });
  async function restore(version: FlowVersion): Promise<void> {
    try {
      await api.restoreVersion(route.flowId, version.id);
      notify(fill(words.restored, { n: version.number }), "success");
      history = await api.listVersions(route.flowId);
      context.instance<XWUIComposer>("versions-list")?.setTree(list());
    } catch (error) {
      notify(errorMessage(error), "danger");
    }
  }

  return {
    bar: {
      crumbs: [{ label: workspace.project.name, href: href(paths.flows) }, { label: history.flow.name, href: href(paths.flow(route.flowId)) }, { label: words.title }],
      sample: "data",
      actions: [button("gradient", words.openEditor, { size: "sm", onClick: () => navigate(paths.flow(route.flowId)) })],
    },
    body: [
      text("h2", fill(words.crumb, { flow: history.flow.name })),
      text("lead", words.lead),
      { tag: "xwui-composer", key: "versions-list", data: { tree: list() } },
    ],
  };
}
