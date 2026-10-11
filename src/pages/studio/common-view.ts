import { notify } from "../../app/notify";
import { navigate, paths } from "../../app/router";
import { catalog } from "../../content/catalog";
import { centred, type Node } from "../../ui/kit";

const words = catalog.studio;

type ProjectTab = (typeof words.projectTabs)[number];

const tabRoutes: Record<string, string> = { flows: paths.flows, connections: paths.connections, runs: paths.runs };

/** Flows, Connections, Runs and the other project sections, as XWUI pill tabs. */
export function projectTabs(active: string, only?: ReadonlyArray<ProjectTab["id"]>): Node {
  const tabs = words.projectTabs.filter((tab) => !only || only.includes(tab.id));
  const node: Node = {
    tag: "xwui-tabs",
    data: { tabs: tabs.map((tab) => ({ id: tab.id, label: tab.label })), activeTab: active },
    config: { variant: "button", size: "sm", ariaLabel: words.projectTabsLabel, hideContent: "true" },
    ref: (instance) => {
      const nav = instance as { onChange(handler: (id: string) => void): void; setActiveTab(id: string): void };
      nav.onChange((id) => {
        const tab = tabs.find((item) => item.id === id);
        if (tab?.route && tabRoutes[tab.route]) return navigate(tabRoutes[tab.route]);
        notify(words.comingSoon.replace("{name}", tab?.label ?? id), "info");
        nav.setActiveTab(active);
      });
    },
  };
  return { ...centred(node), config: { ...centred(node).config, justify: "flex-start" } };
}
