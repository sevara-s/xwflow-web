import { api } from "../../api/client";
import { fill } from "../../app/format";
import { notify } from "../../app/notify";
import { debounce } from "../../app/timing";
import type { ViewContext } from "../../app/view";
import { config } from "../../config";
import { catalog } from "../../content/catalog";
import type { NodeType, StepGroup } from "../../types/domain";
import { hueOf, stepType } from "../../ui/flow";
import { band, button, centred, eyebrow, glass, grid, headline, iconTile, measure, row, shape, stack, tag, text, type Node } from "../../ui/kit";
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
    config: { surface: "glass", padding: 20, hoverLift: true, role: "button", ariaLabel: item.label },
    on: { click: () => opened(item) },
    slots: {
      children: stack(
        [
          row([iconTile(type.icon, hueOf[item.group])]),
          stack([text("body", item.label, { bold: true }), hueText(catalog.studio.groupLabels[item.group], hueOf[item.group])], { gap: 2 }),
          text("small", item.summary, { tone: "secondary" }),
        ],
        { gap: 14 },
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
                text("h3", item.label),
                text("body", item.summary, { tone: "secondary" }),
              ],
              { gap: 8 },
            ),
          ],
          { gap: 24 },
        ),
        button("gradient", words.viewStep, { icon: "arrow-right", iconAfter: true, onClick: () => opened(item) }),
      ],
      { gap: 24, justify: "space-between" },
    ),
    { pad: "l" },
  );
}

function directory(items: NodeType[], filtered: boolean): Node {
  if (!items.length) return { tag: "xwui-empty", data: { icon: "search", title: words.empty.title, description: words.empty.description } };
  const first = items.find((item) => item.featured);
  const rest = items.filter((item) => item !== first);
  const more = glass(stack([text("disp", "+", { tone: "gradient" }), text("body", words.more, { bold: true }), text("small", words.moreBody, { tone: "secondary" })], { gap: 8 }), {
    pad: "m",
  });
  return stack([...(first ? [featured(first)] : []), grid([...rest.map(card), ...(filtered ? [] : [more])], 230)], { gap: 24 });
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
    config: { type: "search", leadingIcon: "search", ariaLabel: words.searchLabel, suffix: words.searchKeys, fullWidth: true, size: "lg" },
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
    config: { variant: "button", size: "sm", ariaLabel: words.groupsLabel, hideContent: "true" },
    ref: (instance) =>
      (instance as XWUINavTabs).onChange((id: string) => {
        query.group = id === "all" ? "" : (id as StepGroup);
        void reload();
      }),
  };

  const hero: Node = {
    tag: "xwui-box",
    key: "band-hero",
    config: { as: "section", position: "relative", padding: "80px 0 40px" },
    slots: {
      children: stack(
        [
          shape("halo", "violet", 520, { left: "32%", top: "-120px" }),
          shape("cube", "lime", 64, { left: "12%", top: "80px" }),
          shape("cube", "pink", 44, { right: "14%", top: "200px" }),
          shape("orb", "violet", 70, { right: "9%", top: "40px" }),
          {
            tag: "xwui-container",
            config: { maxWidth: 1280, center: true, padding: "0 24px" },
            slots: {
              children: stack(
                [
                  centred(eyebrow(words.eyebrow)),
                  headline("h1", words.title, words.titleHighlight, "center"),
                  measure(text("lead", fill(words.lead, { n: first.total }), { align: "center" })),
                  measure(glass(search, { pad: "none" }), 640),
                  centred(tabs),
                ],
                { gap: 24, align: "stretch" },
              ),
            },
          },
        ],
        { gap: 0 },
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
      { gap: 24 },
    ),
  ];
}
