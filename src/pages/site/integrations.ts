import { api } from "../../api/client";
import { fill } from "../../app/format";
import { notify } from "../../app/notify";
import { debounce } from "../../app/timing";
import type { ViewContext } from "../../app/view";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { NodeType, StepGroup } from "../../types/domain";
import { hueOf, stepType } from "../../ui/flow";
import { band, button, centred, decoration, eyebrow, glass, grid, headline, iconTile, inset, measure, row, sides, space, stack, tag, text, type Node } from "../../ui/kit";
import { pageMax } from "../../ui/layout";
import type { XWUIComposer, XWUIInputText, XWUINavTabs } from "../../xwui";

const words = catalog.site.integrations;
const groups: StepGroup[] = ["trigger", "control", "data", "ai", "integration"];

function opened(item: NodeType): void {
  notify(fill(words.opened, { name: item.label, group: catalog.studio.groupLabels[item.group] }), "info");
}

function card(item: NodeType): Node {
  const type = stepType(item.id, item.group);
  return {
    tag: "xwui-box",
    config: { surface: "glass", padding: space("xl"), hoverLift: true, role: "button", ariaLabel: item.label },
    on: { click: () => opened(item) },
    slots: {
      children: stack(
        [
          row([iconTile(type.icon, hueOf[item.group])]),
          stack([text("body", item.label, { bold: true }), hueText(catalog.studio.groupLabels[item.group], hueOf[item.group])], { gap: "xs" }),
          text("small", item.summary, { tone: "secondary" }),
        ],
        { gap: "l" },
      ),
    },
  };
}

/** A small label in a step group's hue. */
function hueText(value: string, hue: string): Node {
  const node = text("xs", value);
  node.config = { ...node.config, textColor: `var(--xwui-hue-${hue}, var(--text-secondary))` };
  return node;
}

function featured(item: NodeType): Node {
  const type = stepType(item.id, item.group);
  return glass(
    row(
      [
        row(
          [
            { tag: "xwui-icon-tile", data: { icon: type.icon }, config: { hue: hueOf[item.group], size: "lg" } },
            stack(
              [
                row([tag(words.featured, hueOf[item.group]), tag(catalog.studio.groupLabels[item.group])]),
                text("h3", item.label, { level: 2 }),
                text("body", item.summary, { tone: "secondary" }),
              ],
              { gap: "s" },
            ),
          ],
          { gap: "xl" },
        ),
        button("gradient", words.viewStep, { icon: "arrow-right", iconAfter: true, onClick: () => opened(item) }),
      ],
      { gap: "xl", justify: "space-between" },
    ),
    { pad: "l" },
  );
}

function directory(items: NodeType[], filtered: boolean): Node {
  if (!items.length) return { tag: "xwui-empty", data: { icon: "search", title: words.empty.title, description: words.empty.description } };
  const first = items.find((item) => item.featured);
  const rest = items.filter((item) => item !== first);
  const more = glass(stack([text("disp", "+", { tone: "gradient" }), text("body", words.more, { bold: true }), text("small", words.moreBody, { tone: "secondary" })], { gap: "s" }), {
    pad: "m",
  });
  return stack([...(first ? [featured(first)] : []), grid([...rest.map(card), ...(filtered ? [] : [more])], "card")], { gap: "xl" });
}

export async function view(context: ViewContext): Promise<Node[]> {
  const query: { q: string; group: StepGroup | "" } = { q: "", group: "" };
  const first = await api.listNodeTypes();

  const reload = async (): Promise<void> => {
    const result = await api.listNodeTypes(query);
    context.instance<XWUIComposer>("integrations-list")?.setTree(directory(result.items, Boolean(query.q || query.group)));
  };

  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== "/" || (event.target as HTMLElement).closest("input, textarea")) return;
    event.preventDefault();
    context.instance<XWUIInputText>("integrations-search")?.focus();
  };
  document.addEventListener("keydown", onKey);
  context.onLeave(() => document.removeEventListener("keydown", onKey));

  const search: Node = {
    tag: "xwui-input-text",
    key: "integrations-search",
    data: { placeholder: words.search },
    config: { type: "search", leadingIcon: "search", ariaLabel: words.searchLabel, suffix: words.searchKeys, fullWidth: true, size: "xl" },
    ref: (instance) =>
      (instance as XWUIInputText).onChange(
        debounce((value: string) => {
          query.q = value.trim();
          void reload();
        }, config.searchDebounceMs),
      ),
  };
  const tabs: Node = {
    tag: "xwui-tabs",
    data: { tabs: [{ id: "all", label: words.all }, ...groups.map((group) => ({ id: group, label: catalog.studio.groupLabels[group] }))], activeTab: "all" },
    config: { variant: "button", size: "sm", ariaLabel: words.groupsLabel, contentMode: "hidden" },
    ref: (instance) =>
      (instance as XWUINavTabs).onChange((id: string) => {
        query.group = id === "all" ? "" : (id as StepGroup);
        void reload();
      }),
  };

  const hero: Node = {
    tag: "xwui-box",
    key: "band-hero",
    config: { as: "section", position: "relative", padding: inset("hero", "xxxl") },
    slots: {
      children: stack(
        [
          decoration("integrations.halo"),
          decoration("integrations.cube"),
          decoration("integrations.cube2"),
          decoration("integrations.orb"),
          {
            tag: "xwui-container",
            config: { maxWidth: pageMax, center: true, padding: sides("xl") },
            slots: {
              children: stack(
                [
                  centred(eyebrow(words.eyebrow)),
                  headline("h1", words.title, words.titleHighlight, "center"),
                  measure(text("lead", fill(words.lead, { n: first.total }), { align: "center" })),
                  measure(glass(search, { pad: "none", glow: "violet" }), "search"),
                  centred(tabs),
                ],
                { gap: "xl", align: "stretch" },
              ),
            },
          },
        ],
        { gap: "none" },
      ),
    },
  };

  return [
    hero,
    band(
      "directory",
      [
        { tag: "xwui-alert", data: { message: words.note }, config: { variant: "info", size: "small" } },
        { tag: "xwui-composer", key: "integrations-list", data: { tree: directory(first.items, false) } },
      ],
      // As the prototype: the directory follows the hero directly.
      { gap: "xl", padding: inset("none", "section") },
    ),
  ];
}
