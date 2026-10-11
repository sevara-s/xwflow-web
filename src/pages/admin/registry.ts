import { api } from "../../api/client";
import { fill } from "../../app/format";
import { errorMessage, notify } from "../../app/notify";
import { adminBar } from "../../app/shells/admin-view";
import { debounce } from "../../app/timing";
import type { PageResult, ViewContext } from "../../app/view";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { RegistryNode, StepGroup } from "../../types/domain";
import { hueOf } from "../../ui/flow";
import { glass, iconTile, row, stack, tag, text, type Node } from "../../ui/kit";
import type { XWUIComposer, XWUIInputText } from "../../xwui";
import { choice, pageHead, toggle } from "./console-view";

const words = catalog.console.registry;
const groups = catalog.studio.groupLabels;

function usedLabel(n: number): string {
  return n === 0 ? words.unused : n === 1 ? words.usedByOne : fill(words.usedBy, { n });
}

export async function view(context: ViewContext): Promise<PageResult> {
  const query: { q?: string; group?: StepGroup | "" } = {};
  let nodes = (await api.listNodeRegistry(query)).nodes;

  const setEnabled = async (node: RegistryNode, enabled: boolean): Promise<void> => {
    try {
      await api.setNodeEnabled(node.id, enabled);
      notify(fill(enabled ? words.enabled : words.disabled, { name: node.label }), enabled ? "success" : "info");
    } catch (error) {
      notify(errorMessage(error), "warning");
    }
    // Redraw from the API either way, so a refused change shows its switch back where it was.
    await reload();
  };

  const nodeRow = (node: RegistryNode): Node =>
    glass(
      row(
        [
          row(
            [
              iconTile(catalog.studio.groupIcons[node.group], hueOf[node.group], "sm"),
              stack([row([text("small", node.label, { bold: true }), tag(groups[node.group]), tag(fill(words.version, { v: node.version }), "plan")], { gap: "s", wrap: true }), text("xs", node.summary, { tone: "secondary" })], { gap: "xs" }),
            ],
            { gap: "m" },
          ),
          row([text("xs", usedLabel(node.usedBy), { tone: "tertiary" }), toggle(node.enabled, fill(words.toggle, { name: node.label }), (on) => void setEnabled(node, on))], { gap: "l" }),
        ],
        { justify: "space-between", wrap: true, gap: "m" },
      ),
      { pad: "s" },
    );

  const list = (): Node =>
    nodes.length ? stack(nodes.map(nodeRow), { gap: "m" }) : { tag: "xwui-empty", data: { icon: "search", title: words.empty.title, description: words.empty.description } };

  async function reload(): Promise<void> {
    try {
      nodes = (await api.listNodeRegistry(query)).nodes;
      context.instance<XWUIComposer>("registry-list")?.setTree(list());
    } catch (error) {
      notify(errorMessage(error, catalog.errors.load), "danger");
    }
  }

  return {
    bar: adminBar(context.admin!, "admin", words.title),
    body: [
      ...pageHead(words.title, words.lead),
      row(
        [
          {
            tag: "xwui-input-text",
            data: { placeholder: words.search },
            config: { type: "search", leadingIcon: "search", ariaLabel: words.search, clearable: true },
            ref: (instance) =>
              (instance as XWUIInputText).onChange(
                debounce((value: string) => {
                  query.q = value.trim();
                  void reload();
                }, config.searchDebounceMs),
              ),
          },
          choice("", [{ value: "", label: words.anyGroup }, ...(Object.keys(groups) as StepGroup[]).map((value) => ({ value, label: groups[value] }))], words.columns.kind, (value) => {
            query.group = value as StepGroup | "";
            void reload();
          }),
        ],
        { gap: "m", wrap: true },
      ),
      { tag: "xwui-composer", key: "registry-list", data: { tree: list() } },
    ],
  };
}
